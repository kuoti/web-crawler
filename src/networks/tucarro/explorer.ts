import { Explorer } from "../../api/explore";
import log4js from "log4js";

const logger = log4js.getLogger("tucarro-explorer")

export default class TuCarroExplorer implements Explorer {
    explore = function () : void {
        logger.info("Done!!!");
    };
    
}