/**
 * @fileoverview This file is used to build static home pages given the request object. It is used for server side rendering and front end multi-page applications.
 */

import { getJSON, getTemplate } from './files.ts';
import { capitalize, fromSnakeCase } from '../../shared/text.ts';
import { Req } from '../structure/app/req.ts';
import { Res } from '../structure/app/res.ts';
import { Next } from '../structure/app/app.ts';
import { attemptAsync } from '../../shared/attempt.ts';

/**
 * Object containing all the pages that can be built
 * @date 10/12/2023 - 3:25:12 PM
 *
 * @type {{
    [key: string]: (req?: Request) => Promise<string>;
}}
 */
const builds: {
    [key: string]: (req?: Req) => Promise<string>;
} = {
    // put your pages here:
    /*
    example:
        '/account': async (req: Request) => {
            const { account } = req.session;

            if (account) {
                const template = await getTemplate('account', account); // uses node-html-constructor if you pass in the second parameter
                return template;
            }

            return 'You are not logged in.';
        }
    */
};

/**
 * Middleware that builds the page if it exists
 * @date 10/12/2023 - 3:25:12 PM
 *
 * @async
 */
export const builder = async (req: Req, res: Res, next: Next) => {
    const { url } = req;
    if (builds[url]) {
        const r = await homeBuilder(url);
        if (r.isOk()) res.send(r.value);
        else {
            res.sendStatus('server:unknown-server-error');
        }
    } else {
        next();
    }
};

/**
 * Builds the home pages using a template
 * @date 10/12/2023 - 3:25:12 PM
 *
 * @async
 */
export const homeBuilder = async (url: string) => {
    return attemptAsync(async () => {
        const [footerResult, navbarResult] = await Promise.all([
            getTemplate('components/footer', {
                year: new Date().getFullYear(),
            }),
            navBuilder(url, false),
        ]);

        if (footerResult.isErr()) throw new Error(footerResult.error);
        if (navbarResult.isErr()) throw new Error(navbarResult.error);

        const r = await getTemplate('home/index', {
            pageTitle: capitalize(fromSnakeCase(url, '-')).slice(1),
            content: builds[url] ? await builds[url]() : '',
            footer: footerResult.value,
            navbar: navbarResult.value,
        });

        if (r.isErr()) throw new Error(r.error);
        return r.value;
    });
};

/**
 * Generates the navbar
 * @date 10/12/2023 - 3:25:12 PM
 *
 * @async
 */
export const navBuilder = async (url: string, offcanvas: boolean) => {
    return await getTemplate('components/navbar', {
        offcanvas: {
            offcanvas,
        },
        navbarRepeat: await getJSON<string[]>('pages/home').then((r) => {
            if (r.isErr()) throw new Error(r.error);
            return r.value.map((page: string) => {
                return {
                    active: '/' + page === url,
                    name: capitalize(fromSnakeCase(page, '-')),
                    link: '/' + page,
                };
            });
        }),
    });
};
