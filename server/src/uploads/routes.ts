import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const uploadsRouter = Router();

export const UPLOADS_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — enough for short clips/gifs/audio without inviting abuse

const ALLOWED_MIME_PREFIXES = ["video/", "audio/", "image/"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Envie vídeo, áudio ou imagem/gif."));
    }
  },
});

uploadsRouter.use(requireAuth);

uploadsRouter.post("/", (req: AuthedRequest, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "Arquivo maior que o limite de 25MB."
        : err.message || "Erro ao enviar arquivo.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    return res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  });
});
