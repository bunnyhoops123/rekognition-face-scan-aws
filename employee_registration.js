import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import  { RekognitionClient, IndexFacesCommand  } from '@aws-sdk/client-rekognition';
import ddb from "@aws-sdk/lib-dynamodb";
import * as dynamodb from "@aws-sdk/client-dynamodb";
const docClient = new dynamodb.DynamoDBClient()
const rekognition = new RekognitionClient();
const s3 = new S3Client();

const ddbDocClient = ddb.DynamoDBDocumentClient.from(docClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
})

const putItem_dynamo = async (params) => {
  let command = new ddb.PutCommand(params);
    const data = await ddbDocClient.send(command);
    return data;
}

const index_employee_image =  async (bucket, key)=>{
  try {
    let params = {
      Image:{
        S3Object: {
          "Bucket": bucket,
          "Name": key
        }
      },
      CollectionId: "employees"
    };
    const command = new IndexFacesCommand(params);
    console.log("test1");
    console.log("Command: ", command);
    let response = await rekognition.send(command);//Error
    console.log("test2");
    console.log('Index_employee_image response:', response);

    if (response.FaceRecords && response.FaceRecords.length > 0) {
      let faceId = response.FaceRecords[0].Face.FaceId;
      return faceId;
    } else {
      throw new Error("No faces detected in the image.");
    }
  } catch (err) {
    console.error('Error in index_employee_image:', err);
    throw err; // Rethrow the error to be caught by the caller
  }
  
}

//Create item in dynamo table 
// const register_employee = async  (firstName, lastName, faceId)=>{
//   let putDataParams = {
//             TableName: "employee-face-scan",
//             Item: {
//               rekognitionId: faceId,
//               firstName: firstName,
//               lastName: lastName
//             }
//         }
//         let putItemResult = await putItem_dynamo(putDataParams);
//         console.log('Dynamo action: ',putItemResult, putDataParams);
//         return "User created";
  
// }
const register_employee = async (firstName, lastName, faceId) => {
  try {
    const putDataParams = {
      TableName: "employee-face-scan",
      Item: {
        rekognitionid: faceId,
        firstName: firstName,
        lastName: lastName
      }
    };

    // Perform the DynamoDB put operation
    const putItemResult = await putItem_dynamo(putDataParams);
    console.log('Dynamo action result:', putItemResult);

    // Check if the put operation was successful
    if (putItemResult && putItemResult.$metadata.httpStatusCode === 200) {
      return "User created";
    } else {
      throw new Error("Failed to create user. DynamoDB operation was not successful.");
    }
  } catch (error) {
    console.error('Error in register_employee:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
};

export const handler = async (event) => {
  console.log("EVENT", event);
  console.log("bucket trigger data s3",event['Records'][0]['s3']);
  
  let bucket = event['Records'][0]['s3']['bucket']['name'];
  let key = event['Records'][0]['s3']['object']['key'];
  console.log('bucket', bucket);
  console.log('key', key);

 
  try{
    let response = await  index_employee_image(bucket, key);
    console.log("RESPONSE: ", response)
    //Check if response is
      let faceId = response;
      //Image file name is ex: sumukh_varma.jpg
      let name = key.split('.')[0].split('_');
      let firstname = name[0];
      let lastname = name[1];
      await register_employee(firstname, lastname, faceId);
      console.log("Hero");
      return response;
  }catch(err){
    throw new Error(err);
  }
  
};
