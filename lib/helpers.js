export const getOtherMember=(members,userId)=>
    
 members.find((member) => member._id !== userId);



export const getSockets = (users=[])=>{
    const sockets =users.map((user)=>userSocketIDs.get(user._id));
    return sockets;
};

export const getBase64 =(file)=> `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;