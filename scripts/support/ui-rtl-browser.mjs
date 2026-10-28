import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
export async function testArabic(browser, origin, shots) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snap = async (name) => {
    if (shots) {
      await mkdir(shots, { recursive: true });
      await page.screenshot({
        path: resolve(shots, name + ".png"),
        fullPage: true,
      });
    }
  };
  const arabic = () =>
    page.getByRole("button", { name: "العربية", exact: true });
  const english = () =>
    page.getByRole("button", { name: "English", exact: true });
  await page.goto(origin);
  await arabic().click();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.equal(await page.locator("html").getAttribute("lang"), "ar");
  assert.equal(
    await page.evaluate(() => globalThis.localStorage.getItem("eh360-locale")),
    "ar",
  );
  await page.reload();
  await page.getByRole("button", { name: "استكشف تجربة المريض" }).waitFor();
  await snap("20-ar-login");
  await english().focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Explore the patient demo" })
    .waitFor();
  await arabic().click();
  await page.getByRole("button", { name: "استكشف تجربة المريض" }).click();
  await page.getByRole("heading", { name: "صباح الخير، Ahmed." }).waitFor();
  await snap("21-ar-patient-dashboard");
  await page.getByText("أدوات العرض التجريبي", { exact: true }).click();
  for (const state of ["loading", "empty", "error", "ready"]) {
    await page.getByLabel("حالة الشاشة").selectOption(state);
    if (state === "loading")
      await page
        .getByRole("status", { name: "جارٍ التحميل", exact: true })
        .first()
        .waitFor();
    if (state === "empty")
      await page
        .getByText("لا توجد بيانات هنا بعد", { exact: true })
        .first()
        .waitFor();
    if (state === "error")
      await page
        .getByText("تعذر تحميل هذه الشاشة", { exact: true })
        .first()
        .waitFor();
  }
  await page.getByText("أدوات العرض التجريبي", { exact: true }).click();
  const demoBefore = await page.evaluate(() =>
    globalThis.localStorage.getItem("eh360-ui-demo-v1"),
  );
  await english().click();
  await arabic().click();
  assert.equal(
    await page.evaluate(() =>
      globalThis.localStorage.getItem("eh360-ui-demo-v1"),
    ),
    demoBefore,
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "ابحث عن طبيب" })
    .click();
  await snap("22-ar-discovery");
  await page
    .getByRole("link", { name: "عرض الملف والأوقات المتاحة" })
    .first()
    .click();
  await page.locator(".slots button").first().click();
  await snap("23-ar-doctor-profile");
  await page
    .getByRole("button", { name: "مراجعة الموعد", exact: true })
    .click();
  await snap("24-ar-booking-review");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "مراجعة الموعد", exact: true })
    .click();
  await page.getByRole("button", { name: "تأكيد الحجز", exact: true }).click();
  await page.getByText("تم تأكيد تفاصيل زيارتك", { exact: true }).waitFor();
  await page.getByLabel("مساحة العرض التجريبي").selectOption("CLINICIAN");
  await page.getByRole("link", { name: "فتح الموعد" }).waitFor();
  await snap("25-ar-doctor-dashboard");
  await page.getByRole("link", { name: "فتح الموعد" }).click();
  await page.getByRole("link", { name: "فتح مساحة الاستشارة" }).click();
  const complaint = "نص سريري عربي كما أدخله الطبيب — exact clinical text";
  await page.getByLabel("الشكوى الحالية والمشكلات").fill(complaint);
  await page
    .getByLabel("التشخيص أو التقييم الذي يدخله الطبيب")
    .fill("تقييم افتراضي مدخل يدويًا");
  await page
    .getByLabel("تعليمات المريض والملخص المشارك")
    .fill("تعليمات المريض تبقى كما أُدخلت.");
  await page.getByLabel("ملاحظة خاصة للطبيب").fill("PRIVATE-RTL-NOTE");
  await english().click();
  assert.equal(
    await page.getByLabel("Presenting complaint / problems").inputValue(),
    complaint,
  );
  await arabic().click();
  await page
    .getByLabel("اسم الدواء (اختياري)")
    .fill("دواء افتراضي — كما أدخله الطبيب");
  await page
    .getByLabel("الجرعة وطريقة الاستخدام والتعليمات")
    .fill("تعليمات افتراضية مدخلة يدويًا");
  await page.getByLabel("طلب تحليل مخبري (اختياري)").fill("طلب تحليل افتراضي");
  await snap("26-ar-consultation-workspace");
  await page.getByRole("button", { name: "مراجعة الملخص ومشاركته" }).click();
  await page.getByRole("button", { name: "مشاركة الملخص التجريبي" }).click();
  await page
    .getByText("تمت مشاركة الملخص مع المريض الافتراضي", { exact: true })
    .waitFor();
  await page.getByLabel("مساحة العرض التجريبي").selectOption("PATIENT");
  await page.goto(origin + "/patient/history");
  await page.getByText(complaint, { exact: true }).waitFor();
  assert.ok(
    !(await page.locator("#main").innerText()).includes("PRIVATE-RTL-NOTE"),
  );
  for (const role of ["PHARMACY_STAFF", "LAB_STAFF", "ADMIN"]) {
    await page.getByLabel("مساحة العرض التجريبي").selectOption(role);
    await page.locator("#main h1").waitFor();
    if (role === "PHARMACY_STAFF") {
      await page.getByRole("button", { name: "بدء التجهيز" }).click();
      await page
        .getByRole("button", { name: "تأكيد صرف الصنف كاملًا" })
        .click();
      await page.getByText("تم الصرف", { exact: true }).first().waitFor();
    }
    if (role === "LAB_STAFF") {
      await page.getByRole("button", { name: "بدء المعالجة" }).click();
      await page.getByLabel("نص النتيجة").fill("نتيجة افتراضية كما أُدخلت");
      await page
        .getByRole("button", { name: "مشاركة النتيجة التجريبية" })
        .click();
      await page.getByText("النتيجة المشاركة", { exact: true }).waitFor();
    }
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  }
  await page.getByLabel("مساحة العرض التجريبي").selectOption("PATIENT");
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/patient",
      "/patient/discover",
      "/patient/doctors/mariam-hassan",
      "/patient/appointments",
      "/patient/record",
      "/patient/settings",
    ]) {
      await page.goto(origin + route);
      await page.locator("#main").waitFor();
      await page.locator("#main .loading").first().waitFor({ state: "hidden" });
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.window.innerWidth,
        ),
        `RTL overflow ${width} ${route}`,
      );
      if (width === 390 && route === "/patient")
        await snap("27-ar-mobile-dashboard");
    }
  }
  await page.getByRole("button", { name: "فتح قائمة التنقل" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "ابحث عن طبيب" })
    .click();
  await page.waitForURL("**/patient/discover");
  assert.equal(await page.locator(".sidebar.open").count(), 0);
  await english().click();
  assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(
    await page.evaluate(() => globalThis.localStorage.getItem("eh360-locale")),
    "en",
  );
  await arabic().click();
  const providerId = "22222222-2222-4222-8222-222222222222",
    clinicId = "33333333-3333-4333-8333-333333333333";
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          data: {
            user: { email: "synthetic@example.invalid", role: "PATIENT" },
            csrfToken: "synthetic-csrf",
          },
        },
      });
    if (path.endsWith("/availability"))
      return route.fulfill({
        json: {
          data: [
            {
              id: "live-slot",
              providerId,
              clinicId,
              startAt: "2026-11-02T23:30:00-05:00",
              endAt: "2026-11-03T00:00:00-05:00",
              timeZone: "America/New_York",
              bookable: true,
            },
          ],
          meta: { page: 1, pageSize: 20, total: 1 },
        },
      });
    return route.fulfill({
      json: {
        data: {
          id: providerId,
          displayName: "Public Doctor",
          specialty: { key: "general", displayName: "General medicine" },
          clinics: [
            {
              id: clinicId,
              displayName: "Public Clinic",
              city: "City",
              address: "Address",
            },
          ],
        },
      },
    });
  });
  await page.evaluate(() =>
    globalThis.localStorage.setItem("eh360-ui-mode", "live"),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(origin + "/patient/doctors/" + providerId);
  await page.getByText("أوقات فعلية ← حجز تجريبي", { exact: true }).waitFor();
  await page.locator(".slots button").first().click();
  await snap("28-ar-live-availability");
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.window.innerWidth,
      ),
      "Arabic live availability overflow",
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("button", { name: "مراجعة الحجز التجريبي" }).click();
  await page
    .getByRole("dialog")
    .getByText("أوقات فعلية ← حجز تجريبي", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS Arabic/RTL: instant switch both ways, persistence, preference isolation, Golden Demo, entered clinical text unchanged, dialog Escape/release, role navigation, 1440/834/390 overflow.",
  );
}
