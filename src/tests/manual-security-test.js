"use strict";

/**
 * Manuel güvenlik testleri için yardımcı script
 * Bu testleri Postman veya curl ile çalıştırabilirsiniz
 */

const securityTests = {
  // XSS Test Cases
  xssTests: [
    {
      name: "Basic Script Injection",
      method: "POST",
      url: "/api/v1/projects",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer <token>",
      },
      body: {
        title: 'Normal Title<script>alert("XSS")</script>',
        slug: "test-project",
        description: "Safe description",
      },
      expected: "Script tags should be removed from title",
    },
    {
      name: "Event Handler Injection",
      method: "POST",
      url: "/api/v1/users",
      body: {
        firstname: "John",
        lastname: "Doe<img src=x onerror=alert(1)>",
        email: "test@example.com",
        password: "Test123!",
      },
      expected: "onerror attribute should be removed",
    },
  ],

  // NoSQL Injection Test Cases
  nosqlTests: [
    {
      name: "Where Operator Injection",
      method: "GET",
      url: "/api/v1/projects",
      query: {
        filter: JSON.stringify({ $where: "this.private == false" }),
      },
      expected: "Should return 400 Bad Request",
    },
    {
      name: "Regex Operator Abuse",
      method: "GET",
      url: "/api/v1/users",
      query: {
        filter: JSON.stringify({
          email: { $regex: ".*" },
          password: { $ne: null },
        }),
      },
      expected: "Dollar operators should be sanitized",
    },
  ],

  // URL Injection Test Cases
  urlTests: [
    {
      name: "Directory Traversal",
      method: "GET",
      url: "/api/v1/projects/../../../etc/passwd",
      expected: "Should return 400 Bad Request",
    },
    {
      name: "JavaScript URL",
      method: "GET",
      url: "/api/v1/projects",
      query: {
        redirect: "javascript:alert(document.cookie)",
      },
      expected: "Should block javascript: URLs",
    },
  ],

  // File Upload Test Cases
  fileTests: [
    {
      name: "EXE File Upload",
      method: "POST",
      url: "/api/v1/projects",
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: "Bearer <token>",
      },
      formData: {
        title: "Test Project",
        slug: "test-project",
        thumbnail: "fake.exe", // Sahte EXE dosyası
      },
      expected: "Should reject executable files",
    },
    {
      name: "Oversized File Upload",
      method: "POST",
      url: "/api/v1/projects",
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: "Bearer <token>",
      },
      formData: {
        title: "Test Project",
        slug: "test-project",
        thumbnail: "large-file.jpg", // 20MB+ dosya
      },
      expected: "Should reject files larger than 10MB",
    },
  ],
};

// Test sonuçlarını yazdır
console.log("🔒 GÜVENLİK TEST SENARYOLARI");
console.log("============================\n");

Object.entries(securityTests).forEach(([category, tests]) => {
  console.log(`\n${category.toUpperCase()}:`);
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Method: ${test.method}`);
    console.log(`   URL: ${test.url}`);
    console.log(`   Expected: ${test.expected}`);

    if (test.query) {
      console.log(`   Query: ${JSON.stringify(test.query)}`);
    }

    if (test.body) {
      console.log(`   Body: ${JSON.stringify(test.body).substring(0, 100)}...`);
    }
  });
});

console.log("\n📋 TEST İNSTRÜKSİYONLARI:");
console.log("1. Yukarıdaki test caselerini Postman veya curl ile test edin");
console.log("2. Her test için beklenen sonucun alındığını doğrulayın");
console.log("3. Logları kontrol ederek middleware çalışmasını izleyin");
console.log("4. Tüm güvenlik önlemlerinin aktif olduğundan emin olun");
