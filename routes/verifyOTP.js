/* eslint-disable no-console */
const {OTP} = require('../sequelize');
const router = require("express").Router();
const {decode} = require("../middlewares/crypt")




var dates = {
    convert:function(d) {
       
        return (
            d.constructor === Date ? d :
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    compare:function(a,b) {
        // Compare two dates (could be of any type supported by the convert
        // function above) and returns:
        //  -1 : if a < b
        //   0 : if a = b
        //   1 : if a > b
        // NaN : if a or b is an illegal date
        // NOTE: The code inside isFinite does an assignment (=).
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    },
    inRange:function(d,start,end) {
       
       return (
            isFinite(d=this.convert(d).valueOf()) &&
            isFinite(start=this.convert(start).valueOf()) &&
            isFinite(end=this.convert(end).valueOf()) ?
            start <= d && d <= end :
            NaN
        );
    }
}

router.post('/verify/otp', async (req, res, next) => {
  try{
    var currentdate = new Date(); 
    const {verification_key, otp, check} = req.body;
    
    if(!verification_key){
      const response={"Status":"Failure","Details":"Verification Key not provided"}
      return res.status(400).send(response) 
    }
    if(!otp){
      const response={"Status":"Failure","Details":"OTP not Provided"}
      return res.status(400).send(response) 
    }
    if(!check){
      const response={"Status":"Failure","Details":"Check not Provided"}
      return res.status(400).send(response) 
    }

    let decoded;

    try{
      decoded = await decode(verification_key)
    }
    catch(err) {
      const response={"Status":"Failure", "Details":"Bad Request"}
      return res.status(400).send(response)
    }

    var obj= JSON.parse(decoded)
    const check_obj = obj.check
    
    // Check if the OTP was meant for the same email or phone number for which it is being verified 
    if(check_obj!=check){
      const response={"Status":"Failure", "Details": "OTP was not sent to this particular email or phone number"}
      return res.status(400).send(response) 
    }

    const otp_instance= await OTP.findOne({where:{id: obj.otp_id}})

    //Check if OTP is available in the DB
    if(otp_instance!=null){

      //Check if OTP is already used or not
      if(otp_instance.verified!=true){

          //Check if OTP is expired or not
          if (dates.compare(otp_instance.expiration_time, currentdate)==1){

              //Check if OTP is equal to the OTP in the DB
              if(otp===otp_instance.otp){
                  otp_instance.verified=true
                  otp_instance.save()
                  const response={"Status":"Success", "Details":"OTP Matched", "Check": check}
                  return res.status(200).send(response)
              }
              else{
                  const response={"Status":"Failure","Details":"OTP NOT Matched"}
                  return res.status(400).send(response) 
              }
              
          }
          else{
              const response={"Status":"Failure","Details":"OTP Expired"}
              return res.status(400).send(response) 
          }
      }
      else{
          const response={"Status":"Failure","Details":"OTP Already Used"}
          return res.status(400).send(response)
          }
      }
      else{
          const response={"Status":"Failure","Details":"Bad Request"}
          return res.status(400).send(response)
      }
  }
  catch(err){
    const response={"Status":"Failure","Details": err.message}
    return res.status(400).send(response)
  }
});

 
module.exports = router;
