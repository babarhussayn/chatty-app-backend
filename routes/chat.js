import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { getMyChats, newChatGroup,getMyGroup, addMember, removeMember, leaveGroup, sendAttachments, getChatDetails, changeGroupName, deleteChat, getMessages } from '../controllers/chat.js';
import { attachmentsMulter } from '../middleware/multter.js';





const app = express.Router();






app.use(isAuthenticated)
app.post('/new',newChatGroup)
// my Chat 
app.get('/my',getMyChats)

// my chat group
app.get('/mygroup',getMyGroup)

// Add members
app.put('/addmember',addMember)
//remove Member
app.delete('/remove',removeMember)


//Leave OR Left group
app.delete('/leave/:id',leaveGroup)

//Send Attachments
app.post('/message',attachmentsMulter,sendAttachments)


//Chat DEtails
app.route('/:id').get(getChatDetails).put(changeGroupName).delete(deleteChat)

// Get Messages
app.get('/message/:id', getMessages);

export default app;