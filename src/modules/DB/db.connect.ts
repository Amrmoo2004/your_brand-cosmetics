
import  { connect } from "mongoose";
import dotenv from "dotenv";
const connectDB = async (): Promise<void> => {
try {
  dotenv.config(); 
 await connect(process.env.MONGO_URI as string , { serverSelectionTimeoutMS:
    30000 });

console.log("MongoDB connected successfully");

}catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); 
}
}


export default connectDB
