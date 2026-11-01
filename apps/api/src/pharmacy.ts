import {Controller,Get,Post,Req,Res,Param,UseGuards,HttpException} from '@nestjs/common';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {PharmacyError,pharmacyJson,availabilityId,type PharmacyCommand,type PharmacyPersistence,type AuthPrincipal} from '@egyhealth/db';
import {authError,verifyOrigin,requireJson,SessionAuthGuard,SessionAuthenticator,CsrfGuard,sessionCookie,type AuthRuntime} from './auth.js';
type Request=IncomingMessage&{body?:unknown;principal?:AuthPrincipal};
const invalid=()=>authError(400,'REQUEST_INVALID','Invalid request.');
const missing=()=>authError(404,'PHARMACY_NOT_FOUND','Not found.');
function failure(e:unknown){if(e instanceof HttpException)return e;if(e instanceof PharmacyError){if(e.code==='PHARMACY_INVALID')return invalid();if(e.code==='PHARMACY_UNAUTHENTICATED')return authError(401,'AUTH_UNAUTHENTICATED','Authentication required.');if(e.code==='PHARMACY_NOT_FOUND')return missing();if(e.code==='PHARMACY_CONFLICT')return authError(409,'PHARMACY_CONFLICT','Conflicting pharmacy operation.');}return authError(503,'PHARMACY_UNAVAILABLE','Service unavailable.');}
function send(q:Request,s:ServerResponse,status:number,value:unknown){s.statusCode=status;s.setHeader('Cache-Control','no-store');s.setHeader('Content-Type','application/json');s.end(q.method==='HEAD'?undefined:JSON.stringify(value));}
export function pharmacyQuery(raw:string){const query=raw.split('?')[1],out:Record<string,string|number>={};if(query===undefined)return out;if(!query)throw invalid();for(const pair of query.split('&')){const m=/^(page|pageSize)=([1-9][0-9]*)$/.exec(pair),purpose=/^purpose=(fulfillment|history)$/.exec(pair);if(purpose){if(Object.hasOwn(out,'purpose'))throw invalid();out.purpose=purpose[1];}else if(m&&!Object.hasOwn(out,m[1])&&Number(m[2])<=(m[1]==='page'?10000:100))out[m[1]]=Number(m[2]);else throw invalid();}return out;}
export function pharmacyRequestBoundary(auth:AuthRuntime){return(q:Request,s:ServerResponse,next:(e?:unknown)=>void)=>{
 const raw=q.url??'',path=raw.split('?')[0];let decoded=path;try{decoded=decodeURIComponent(path);}catch{/* strict alias rejection */}const normalized=decoded.toLowerCase().replace(/\/+$/,'');
 if(!/^\/api\/v1\/(?:pharmacy-destinations(?:\/|$)|pharmacies(?:\/|$)|consultations\/[^/]+\/prescriptions\/[^/]+\/pharmacy-routes(?:\/|$))/.test(normalized))return next();
 s.setHeader('Cache-Control','no-store');const reject=(e:unknown)=>{const x=failure(e);send(q,s,x.getStatus(),x.getResponse());};let command:PharmacyCommand='ROUTE';
 try{
  if(Buffer.byteLength(raw)>2048||q.rawHeaders.reduce((n,v)=>n+Buffer.byteLength(v),0)>8192)throw invalid();
  const author=/^\/api\/v1\/consultations\/([^/]+)\/prescriptions\/([^/]+)\/pharmacy-routes(?:\/([^/]+)\/(withdrawals|reroutes))?$/.exec(path);
  const staff=/^\/api\/v1\/pharmacies\/([^/]+)\/routes(?:\/([^/]+)(?:\/(accept)|\/items\/([^/]+)\/dispenses|\/dispenses\/([^/]+)\/(corrections|reversals))?)?$/.exec(path);
  const destinations=path==='/api/v1/pharmacy-destinations';
  if(path!==normalized||path.includes('%')||!author&&!staff&&!destinations)throw missing();
  for(const id of author?[author[1],author[2],author[3]]:destinations?[]:[staff![1],staff![2],staff![4],staff![5]])if(id!==undefined)try{availabilityId(id);}catch{throw missing();}
  const mutation=!!author||!!staff?.[3]||!!staff?.[4]||!!staff?.[5],methods=mutation?['POST']:['GET','HEAD'];if(!methods.includes(q.method??'')){s.setHeader('Allow',methods.join(', '));throw authError(405,'METHOD_NOT_ALLOWED','Method not allowed.');}
  if(!mutation){if(q.headers['transfer-encoding']!==undefined||Number(q.headers['content-length']??0)>0)throw invalid();const query=pharmacyQuery(raw);if(destinations&&Object.hasOwn(query,'purpose'))throw invalid();return next();}
  if(raw.includes('?'))throw invalid();verifyOrigin(q,auth.config);requireJson(q);
  const count=(name:string)=>q.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length;if(count('idempotency-key'))throw invalid();if(count('content-encoding')>1||q.headers['content-encoding']!==undefined&&q.headers['content-encoding']!=='identity')throw authError(415,'REQUEST_CONTENT_TYPE_INVALID','Unsupported content type.');
  command=author?(author[4]==='withdrawals'?'WITHDRAW':author[4]==='reroutes'?'REROUTE':'ROUTE'):staff![3]?'ACCEPT':staff![4]?'DISPENSE':staff![6]==='corrections'?'CORRECT':'REVERSE';
 }catch(e){q.resume();return reject(e);}
 void(async()=>{const chunks:Buffer[]=[];let size=0;for await(const chunk of q.iterator({destroyOnReturn:false})){size+=chunk.length;if(size>16384){q.resume();return reject(authError(413,'REQUEST_TOO_LARGE','Request too large.'));}chunks.push(Buffer.from(chunk));}let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch{throw invalid();}q.body=pharmacyJson(raw,command);next();})().catch(reject);
};}
export function pharmacyController(auth:AuthRuntime,store:PharmacyPersistence){
 const session=new SessionAuthGuard(new SessionAuthenticator(auth)),csrf=new CsrfGuard(auth.config);
 async function invoke(q:Request,s:ServerResponse,op:()=>Promise<unknown>){try{const {status=200,...body}=await op() as {status?:number};send(q,s,status,body);}catch(e){if(e instanceof PharmacyError&&e.code==='PHARMACY_UNAUTHENTICATED')s.setHeader('Set-Cookie',sessionCookie(auth.config,null));throw failure(e);}}
 @Controller()
 class PharmacyController{
  @Get('pharmacy-destinations') @UseGuards(session)
  destinations(@Req()q:Request,@Res()s:ServerResponse){return invoke(q,s,()=>store.destinations(q.principal!,pharmacyQuery(q.url!)));}
  @Post('consultations/:consultationId/prescriptions/:prescriptionId/pharmacy-routes') @UseGuards(session,csrf)
  route(@Req()q:Request,@Res()s:ServerResponse,@Param('consultationId')c:string,@Param('prescriptionId')p:string){return invoke(q,s,()=>store.execute('ROUTE',q.principal!,{...q.body as object,consultationId:c,prescriptionId:p}));}
  @Post('consultations/:consultationId/prescriptions/:prescriptionId/pharmacy-routes/:routeId/:command') @UseGuards(session,csrf)
  redirect(@Req()q:Request,@Res()s:ServerResponse,@Param('consultationId')c:string,@Param('prescriptionId')p:string,@Param('routeId')r:string,@Param('command')kind:string){return invoke(q,s,()=>store.execute(kind==='withdrawals'?'WITHDRAW':'REROUTE',q.principal!,{...q.body as object,consultationId:c,prescriptionId:p,routeId:r}));}
  @Get('pharmacies/:pharmacyId/routes') @UseGuards(session)
  queue(@Req()q:Request,@Res()s:ServerResponse,@Param('pharmacyId')p:string){return invoke(q,s,()=>store.read(q.principal!,p,null,pharmacyQuery(q.url!)));}
  @Get('pharmacies/:pharmacyId/routes/:routeId') @UseGuards(session)
  detail(@Req()q:Request,@Res()s:ServerResponse,@Param('pharmacyId')p:string,@Param('routeId')r:string){return invoke(q,s,()=>store.read(q.principal!,p,r,pharmacyQuery(q.url!)));}
  @Post('pharmacies/:pharmacyId/routes/:routeId/accept') @UseGuards(session,csrf)
  accept(@Req()q:Request,@Res()s:ServerResponse,@Param('pharmacyId')p:string,@Param('routeId')r:string){return invoke(q,s,()=>store.execute('ACCEPT',q.principal!,{...q.body as object,pharmacyId:p,routeId:r}));}
  @Post('pharmacies/:pharmacyId/routes/:routeId/items/:itemId/dispenses') @UseGuards(session,csrf)
  dispense(@Req()q:Request,@Res()s:ServerResponse,@Param('pharmacyId')p:string,@Param('routeId')r:string,@Param('itemId')i:string){return invoke(q,s,()=>store.execute('DISPENSE',q.principal!,{...q.body as object,pharmacyId:p,routeId:r,itemId:i}));}
  @Post('pharmacies/:pharmacyId/routes/:routeId/dispenses/:dispenseId/:command') @UseGuards(session,csrf)
  correct(@Req()q:Request,@Res()s:ServerResponse,@Param('pharmacyId')p:string,@Param('routeId')r:string,@Param('dispenseId')d:string,@Param('command')kind:string){return invoke(q,s,()=>store.execute(kind==='corrections'?'CORRECT':'REVERSE',q.principal!,{...q.body as object,pharmacyId:p,routeId:r,dispenseId:d}));}
 }
 return PharmacyController;
}
