const errorMessage=(err,req,res,next) => {
    err.message||= 'internal server Error'
    err.statusCode ||=500

    return res.status(err.statusCode).json({
        success:false,
        message:err.message
    })
}

const TryCatch=(passedFunc)=>async(req,res,next)=>{
try{
    await passedFunc(req,res,next);
}catch(error){
    next(error);
}
}


export {errorMessage,TryCatch} ;