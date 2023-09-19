
import './App.css';
import { createRoot } from 'react-dom'; 
import React, { useState } from 'react';
const uuid = require('uuid');

//TODO: keep placeholder image in visitors folder

function App() {
  const [image, setimage] = useState('');
  const [uploadResultMessage, setUploadResultMessage] = useState('Please upload on image to authenticate');
  const [imgName, setVisitorName] = useState('placeholder.jpg');
  const [isAuth, setAuth] = useState(false);
  function sendImage(e){
    
    e.preventDefault();
    setVisitorName(image.name);
    const visitorImageName = uuid.v4();
    fetch(`https://qr02qpy2gj.execute-api.ap-south-1.amazonaws.com/DEV/face-scan-auth-bucket-s3/${visitorImageName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg'
      },
      body: image
    }).then(async () => {
      const response = await authenticate(visitorImageName);
      if(response.Message == 'Success'){
        setAuth(true);
        setUploadResultMessage(`Hi ${response['firstname']} ${response['lastname']}, welcome to work today.`)

      }else{
        setAuth(false);
        setUploadResultMessage(`Authentication failed.`)
      }
    }).catch(error => {
      setAuth(false);
      setUploadResultMessage("There is an error during auth");
      console.log(error);
    });  
  }

  async function authenticate(visitorImageName){
    const requstUrl = 'https://qr02qpy2gj.execute-api.ap-south-1.amazonaws.com/DEV/employee?' + new URLSearchParams({
      objectKey: `${visitorImageName}.jpeg`
    });
    return await fetch(requstUrl, {
      method: 'GET',
      headers: {
        'Accept': 'aplication/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json())
    .then((data) => {
      return data;
    }).catch(error => console.error(error));
  }

  return (
    <div className="App">
      <h2>Sumukh's Facial Recognition System</h2>
      <form onSubmit={sendImage}>
        <input type ='file' name='image' onChange={e => setimage(e.target.files[0])}/>
        <button type='submit'>Authenticate</button>
      </form>
      <div className ={isAuth ? 'success' : 'failure'}>{uploadResultMessage}</div>
      <img src={ require(`./visitors/${imgName}`) }alt ="Visitor" height={250} width={250}/>
    </div>
  );
}

export default App;
