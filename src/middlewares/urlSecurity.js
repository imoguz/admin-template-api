"use strict";

const validator = require("validator");

// URL güvenlik middleware'i
const urlSecurity = (req, res, next) => {
  try {
    // URL parametrelerini kontrol et
    const checkUrlParams = (params) => {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string") {
          // URL injection attempt'leri kontrol et
          if (
            value.includes("../") ||
            value.includes("file://") ||
            value.includes("javascript:") ||
            value.includes("data:") ||
            value.includes("vbscript:")
          ) {
            console.warn(`Blocked URL injection attempt: ${value}`);
            return res.status(400).json({
              error: true,
              message: "Invalid URL parameters detected",
            });
          }

          // URL decode ve tekrar kontrol et
          try {
            const decoded = decodeURIComponent(value);
            if (
              decoded.includes("../") ||
              decoded.includes("javascript:") ||
              decoded.includes("data:")
            ) {
              console.warn(`Blocked decoded URL injection: ${decoded}`);
              return res.status(400).json({
                error: true,
                message: "Invalid URL parameters detected",
              });
            }
          } catch (e) {
            // Invalid URL encoding - sadece logla, blocklama
            console.warn("Invalid URL encoding detected:", value);
          }
        }
      }
    };

    // Tüm URL component'larını kontrol et
    const paramsCheck = checkUrlParams(req.params);
    if (paramsCheck) return paramsCheck;

    const queryCheck = checkUrlParams(req.query);
    if (queryCheck) return queryCheck;

    // Redirect URL'lerini kontrol et (eğer varsa ve tanımlanmışsa)
    if (req.body && req.body.redirectUrl) {
      if (
        !validator.isURL(req.body.redirectUrl, {
          require_protocol: true,
          protocols: ["http", "https"],
          require_valid_protocol: true,
        })
      ) {
        return res.status(400).json({
          error: true,
          message: "Invalid redirect URL",
        });
      }
    }

    next();
  } catch (error) {
    console.error("URL Security error:", error);
    next(error);
  }
};

module.exports = urlSecurity;
