import express from 'express';
import {getMyProfile, login, newUser,logout, searchUser, sendRequest, acceptRequest, notifications, getMyFriends} from '../controllers/user.js'
import { multerUpload } from '../middleware/multter.js';
import { isAuthenticated } from '../middleware/auth.js';
import { loginValidator, registerValidator,valid } from '../lib/validator.js';





const app = express.Router();




app.post('/login',loginValidator(),valid, login )

app.post('/new',multerUpload.single('avatar'),registerValidator(),valid, newUser )

app.use(isAuthenticated)

app.get('/logout',logout)
app.get('/me',getMyProfile)
app.get('/search',searchUser)
app.put('/sendrequest',sendRequest)
app.put('/accept',acceptRequest)
app.get('/notifications',notifications)
app.get('/friends',getMyFriends)

export default app;