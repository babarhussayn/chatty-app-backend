import express from 'express';
import { adminLogin, allChats, allMessages, allUsers, dashBoard, getAdmin, logout } from '../controllers/admin.js';
import { adminLoginValidator,valid } from '../lib/validator.js';
import { adminOnly } from '../middleware/auth.js';


const app =express.Router();



app.post('/verify',adminLoginValidator(),adminLogin);


app.get('/logout', logout)


app.use(adminOnly)
app.get('/',getAdmin)
app.get('/alluser',allUsers)
app.get('/allchats',allChats)
app.get('/allmessages',allMessages)
app.get('/dashboard',dashBoard)



export default app;