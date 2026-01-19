import {ZodError} from "zod";

//to validate request params//
export const validateParams = (schema) => (req,res,next) =>{
    try{
        req.params = schema.parse(req.params);
        next();//next middlerware//
    }catch (error){
        return res.status(400).json({errors: error.errors});
    }
};

export const validateQuery = (schema) => (req,res,next) =>{
    try{
        req.query = schema.parse(req.query);
        next();//next middlerware//
    }catch(error){
        return res.status(400).json({errors: error.errors});
    }
};

export const validate = (schema) => (req,res,next)=>{
    try{
        req.body = schema.parse(req.body); //generate type safe obj if match schma//
        next(); //next middlerware//
    }catch(error){
        const errors =
            error?.errors ??
            error?.issues ??
            [{ message: error?.message ?? "Validation failed" }];
        console.error("Validation error:", errors);
        return res.status(400).json({ errors });
    }
};
