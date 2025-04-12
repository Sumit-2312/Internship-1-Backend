import mongoose from 'mongoose';
const { Schema,model } = mongoose;

const userSchema = new Schema({
    userName: {type:String,unique:true,required:true},
    InstaId : {type:String,required:true,unique:true},
    accessToken: {type:String,required:true}
})

const userModel = model('User',userSchema);


export {
    userModel as Users
};

