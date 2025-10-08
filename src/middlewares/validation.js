const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false, // Tüm hataları göster
        stripUnknown: true, // Tanımlanmamış alanları kaldır
      });

      if (error) {
        const errorMessage = error.details
          .map((detail) => detail.message.replace(/['"]/g, ""))
          .join(", ");

        return res.status(400).json({
          error: true,
          message: errorMessage,
        });
      }

      // Validated values'i request'e ekle
      req[source] = value;
      next();
    } catch (validationError) {
      console.error("Validation middleware error:", validationError);
      return res.status(500).json({
        error: true,
        message: "Validation error occurred",
      });
    }
  };
};

module.exports = validate;
