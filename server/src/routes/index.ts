import { Router } from "express";
import { catalogController as c } from "../controllers/catalog.controller.js";
import { rfqController as r } from "../controllers/rfq.controller.js";
import { singleDrawing } from "../middleware/upload.js";
import { submitLimiter, uploadLimiter, lookupLimiter } from "../middleware/rateLimit.js";
import { adminRouter } from "./admin.js";
import { productFileController as pf } from "../controllers/product-file.controller.js";
import { chatLimiter } from "../middleware/rateLimit.js";
import { chatController } from "../controllers/chat.controller.js";
import { publicRouter } from "./public.js";

export const apiRouter = Router();

// Staff administration (own auth, CSRF and permissions)
apiRouter.use("/admin", adminRouter);

// Public CMS content and contact form
apiRouter.use(publicRouter);

/** Catalogue reads change rarely; a short shared cache removes repeat requests from every visitor. */
const cacheFor = (seconds: number) => (_req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=300`);
  next();
};

// Catalogue
/** Searched product lists are not shared-cached, because the URL then records what people searched for. */
const cacheUnlessSearching = (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (req.query.search) res.set("Cache-Control", "private, no-store");
  else res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  next();
};
apiRouter.get("/products", cacheUnlessSearching, c.products);
apiRouter.get("/products/:slug", cacheFor(60), c.productBySlug);
apiRouter.get("/products/:slug/files", cacheFor(60), pf.publicList);
apiRouter.get("/product-files/:id", pf.publicDownload);

// AI product assistant
apiRouter.post("/chat", chatLimiter, chatController.message);
apiRouter.get("/categories", cacheFor(300), c.categories);
apiRouter.get("/materials", cacheFor(300), c.materials);
apiRouter.get("/applications", cacheFor(300), c.applications);
apiRouter.get("/processes", cacheFor(300), c.processes);
apiRouter.get("/facets", cacheFor(300), c.facets);

// Company content
apiRouter.get("/industries", cacheFor(300), c.industries);
apiRouter.get("/capabilities", cacheFor(300), c.capabilities);

// Request for quotation
apiRouter.post("/rfq/uploads", uploadLimiter, singleDrawing, r.stageUpload);
apiRouter.delete("/rfq/uploads/:id", uploadLimiter, r.discardUpload);
apiRouter.post("/rfq", submitLimiter, r.submit);
apiRouter.get("/rfq/:rfqNumber", lookupLimiter, r.lookup);
