import { body,validationResult } from "express-validator"
import { ErrorHandler } from "../utils/utility.js";

const registerValidator =()=>[
body("username","please enter username").notEmpty(),

body("password","please enter password").notEmpty(),
body("name","please enter name").notEmpty(),
]
 

const loginValidator =()=>[
    body("username","please enter username").notEmpty(),
    
    body("password","please enter password").notEmpty(),
]
const valid =(req,res,next)=>{;
const error = validationResult(req);


const errorMessages=error
.array().map((errors)=> errors.msg).join(", ");

if(error.isEmpty()) return next();
else next(new ErrorHandler(errorMessages,400));
}

const adminLoginValidator =()=>[
    body("loginkey","please enter login key").notEmpty()
];

export {registerValidator,valid,loginValidator,adminLoginValidator};