import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keysRouter from "./keys";
import ticketsRouter from "./tickets";
import couponsRouter from "./coupons";
import customOrdersRouter from "./custom-orders";
import downloadLinksRouter from "./download-links";
import purchasesRouter from "./purchases";
import freeVerificationsRouter from "./free-verifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keysRouter);
router.use(ticketsRouter);
router.use(couponsRouter);
router.use(customOrdersRouter);
router.use(downloadLinksRouter);
router.use(purchasesRouter);
router.use(freeVerificationsRouter);

export default router;
