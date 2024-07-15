const corsOptions={
    origin: ['http://localhost:3000','http://localhost:3001' ,process.env.CLIENT_SERVER],
    credentials:true,
};

const CHAT_APP='chatt-app'
export {corsOptions,CHAT_APP}