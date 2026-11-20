import {Controller, Put, Req, Res, Param, UseGuards, HttpException} from '@nestjs/common';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {BookingError, availabilityId, type AuthPrincipal, type ConsultationPersistence} from '@egyhealth/db';
import {authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime} from './auth.js';
import {parseBookingJson} from './bookings.js';
type Request=IncomingMessage & {body?:unknown;principal?:AuthPrincipal};
const invalid=()=>authError(400,'REQUEST_INVALID','Invalid request.');
const missing=()=>authError(404,'BOOKING_NOT_FOUND','Not found.');
function failure(e:unknown) {
  if(e instanceof HttpException)return e;
  if(e instanceof BookingError) {
    if(e.code==='BOOKING_INVALID')return invalid();
    if(e.code==='BOOKING_UNAUTHENTICATED')return authError(401,'AUTH_UNAUTHENTICATED','Authentication required.');
    if(e.code==='BOOKING_NOT_FOUND')return missing();
    if(e.code==='BOOKING_CONFLICT')return authError(409,'BOOKING_CONFLICT','Conflicting booking operation.');
  }
  return authError(503,'BOOKING_UNAVAILABLE','Service unavailable.');
}
function send(q:Request,s:ServerResponse,status:number,value:unknown) {
  s.statusCode=status;s.setHeader('Cache-Control','no-store');s.setHeader('Content-Type','application/json');s.end(q.method==='HEAD'?undefined:JSON.stringify(value));
}
/** Exact frozen PUT close only; no generic consultation metadata/read surface. */
export function consultationCloseRequestBoundary(auth:AuthRuntime) {
  return(q:Request,s:ServerResponse,next:(e?:unknown)=>void)=>{
    const raw=q.url??'',path=raw.split('?')[0];let decoded=path;
    try{decoded=decodeURIComponent(path);}catch{/* malformed paths cannot be aliases */}
    const normalized=decoded.toLowerCase().replace(/\/+$/,'');
    if(!/^\/api\/v1\/consultations\/[^/]+\/close(?:\/|$)/.test(normalized))return next();
    s.setHeader('Cache-Control','no-store');
    const reject=(e:unknown)=>{const x=failure(e);send(q,s,x.getStatus(),x.getResponse());};
    try {
      if(Buffer.byteLength(raw)>2048||q.rawHeaders.reduce((n,v)=>n+Buffer.byteLength(v),0)>8192)throw invalid();
      const match=/^\/api\/v1\/consultations\/([^/]+)\/close$/.exec(path);
      if(!match||path!==normalized||path.includes('%'))throw missing();
      try{availabilityId(match[1]);}catch{throw missing();}
      if(q.method!=='PUT'){s.setHeader('Allow','PUT');throw authError(405,'METHOD_NOT_ALLOWED','Method not allowed.');}
      if(raw.includes('?'))throw invalid();
      verifyOrigin(q,auth.config);requireJson(q);
      const count=(name:string)=>q.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length;
      if(count('idempotency-key'))throw invalid();
      if(count('content-encoding')>1||q.headers['content-encoding']!==undefined&&q.headers['content-encoding']!=='identity')throw authError(415,'REQUEST_CONTENT_TYPE_INVALID','Unsupported content type.');
    }catch(e){q.resume();return reject(e);}
    void(async()=>{
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of q.iterator({destroyOnReturn:false})) {size+=chunk.length;if(size>16384){q.resume();return reject(authError(413,'REQUEST_TOO_LARGE','Request too large.'));}chunks.push(Buffer.from(chunk));}
      let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch{throw invalid();}
      // Close shares the exact operationKey/expectedVersion command shape.
      q.body=parseBookingJson(text,'CANCEL');next();
    })().catch(reject);
  };
}
export function consultationCloseController(auth:AuthRuntime,store:ConsultationPersistence) {
  const session=new SessionAuthGuard(new SessionAuthenticator(auth)),csrf=new CsrfGuard(auth.config);
  @Controller()
  class ConsultationCloseController {
    @Put('consultations/:consultationId/close') @UseGuards(session,csrf)
    async close(@Req() q:Request,@Res() s:ServerResponse,@Param('consultationId') id:string) {
      try{send(q,s,200,{data:await store.closeConsultation(q.principal!,{...q.body as object,consultationId:id})});}
      catch(e){if(e instanceof BookingError&&e.code==='BOOKING_UNAUTHENTICATED')s.setHeader('Set-Cookie',sessionCookie(auth.config,null));throw failure(e);}
    }
  }
  return ConsultationCloseController;
}
