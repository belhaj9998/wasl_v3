import { Request , Response } from "express";
import prisma from "../configs/prisma";




export const CrateStoreController= async (req:Request , res:Response) => {
    const {name , domain  , logo , description }=req.body;
    try{

        const {name , domain} =req.body;

        if (!name || !domain) {
            return res.status(400).json({ error: "Please provide all feilds " });
        }
    


        const newStore= await prisma.store.create({
            data:{name , domain  , logo , description}
        });
        res.status(201).json({newStore,message:"Store created successfully"});

    }catch(error){
        res.status(500).json({ error: "Failed to create Store" });
    }
}

