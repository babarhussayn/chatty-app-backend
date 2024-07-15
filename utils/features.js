import mongoose from "mongoose";
import  jwt  from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import {v2 as cloudinary} from "cloudinary";
import  {getBase64}  from "../lib/helpers.js";



const DATABASE='mongodb+srv://babarhusain262:babar123@cluster0.05drski.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const cookieOptions={
    httpOnly:true,
    maxAge: 15 * 24*60 * 60 ,
    sameSite:'none',
    secure:true,

}

mongoose.connect(DATABASE).then(()=>{
    console.log('connected')
}).catch((err)=>{
console.log(err.message)
})



const sendToken= (res,user,code,message)=>{

    try {
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET,{
            expiresIn: cookieOptions.maxAge});
        
        return res
            .status(code)
            .cookie('chatt-app', token, cookieOptions)
            .json({ success: true, message });
    } catch (error) {
        console.error('Error sending token:', error);
        return res.status().json({ success: false, message: 'Internal Server Error' });
    }
    
}
const emitEvent = (res,users,data,event)=>{
console.log('emit event');
}

const uploadFilesToCloudinary = async (files = []) => {
    
    
    
    const uploadPromises = files.map((file) => {
    
        return new Promise((resolve, reject) => {
            const base64String = getBase64(file)
            cloudinary.uploader.upload(
            
                base64String,
                { resource_type: "auto", public_id: uuid() },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    } 
                
                    resolve(result);
                }
            );
        });
                
    
    });
    
    try {
        const results = await Promise.all(uploadPromises);

        
        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url
        }));

        return formattedResults;
        
    } catch (error) {
        console.error('Error uploading files to Cloudinary:', error);
    
        
    }
};

const deleteFilesFromCloudinary= async(public_ids)=>{

}
export {DATABASE,sendToken,cookieOptions,emitEvent,deleteFilesFromCloudinary,uploadFilesToCloudinary}