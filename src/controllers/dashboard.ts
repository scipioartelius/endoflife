import { Request, Response } from "express";

/**
 * GET /
 * Home page.
 */
export let index = (req: Request, res: Response) => {
    res.render("dashboard/index", {
        title: "Dashboard"
    });
};