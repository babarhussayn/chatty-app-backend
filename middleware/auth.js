import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js"


const isAuthenticated= TryCatch(async(req,res,next)=>{

const token= req.cookies['chatt-app']

if (!token) return next(new ErrorHandler('please login ',401));



const decodedData=jwt.verify(token, process.env.JWT_SECRET);


req.user=decodedData._id;


next();

})

const adminOnly= TryCatch(async(req,res,next)=>{

    const token= req.cookies['chatt-app']
    if (!token) return next(new ErrorHandler('please login ',401));
    
    
    const decodedData=jwt.verify(token, process.env.JWT_SECRET);
    req.user=decodedData._id;
    next();
})

const socketAuthenticate= TryCatch(async()=>{

    try{
if(err)return next(err);

const authToken=socket.request.cookies['chatt-app'];
if(!authToken) return next(new ErrorHandler('please login to access this route',401));

const decodedData=jwt.verify(authToken,process.env.JWT_SECRET);

socket.user= await User.findById(decodedData._id)
return next()

    }catch(error){
        return next(new ErrorHandler('please login ',401));
    }

})


 export { isAuthenticated,adminOnly,socketAuthenticate};
 