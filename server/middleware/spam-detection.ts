// const SpamScanner = require('spamscanner');
import { validate } from 'npm:deep-email-validator';
import { Req, Res, Next, ServerFunction } from "../structure/app.ts";
import { log } from "../utilities/terminal-logging.ts";
export type Options = {
    onspam?: (req: Req, res: Res, next: Next) => void;
    onerror?: (req: Req, res: Res, next: Next) => void;
    goToNext?: boolean;
}

// export const detectSpam = (keys: string[], options: Options = {}): NextFunction => {
//         const fn = (req: Request, res: Response, next: NextFunction) => {
//         const arr = keys.map(key => req.body[key]);

//         if (!arr.length) return next();    
//         const scanner = new SpamScanner();

//         Promise.all(arr.map(value => scanner.scan(value)))
//             .then(results => {
//                 const isSpam = results.some(result => result.is_spam);

//                 if (isSpam) {
//                     req.body.__spamResults = results;
//                     if (options.onspam) return options.onspam(req, res, next);
//                     if (options.goToNext) next();
//                     return;
//                 }

//                 next();
//             })
//             .catch(err => {
//                 console.log(err);
//                 if (options.onerror) options.onerror(req, res, next);
//             })
//     }

//     return fn as NextFunction;
// };


export const emailValidation = (keys: string[], options: Options = {}): ServerFunction => {
    return (req: Req, res: Res, next: Next) => {
        const arr = keys.map(key => req.body[key]).filter(Boolean);

        if (!arr.length) return next();    

        Promise.all(arr.map(value => validate({ email: value })))
            .then((results) => {
                const valid = results.every(result => result.valid);
                if (valid) return next();
                req.body.__emailResults = results;
                if (options.onspam) return options.onspam(req, res, next);
                if (options.goToNext) next();
            })
            .catch(err => {
                if (options.onerror) return options.onerror(req, res, next);
                // console.error(err);
                next();
            });
    }
};