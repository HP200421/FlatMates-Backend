import { asyncHandler } from "../utils/asyncHandler.js";
import twilio from "twilio";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import otpGenerator from "otp-generator";
import { Otp } from "../models/otp.model.js";
import { Users } from "../models/user.model.js";

const sendOpt = asyncHandler(async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT;
  const authToken = process.env.TWILIO_AUTHTOKEN;
  const client = twilio(accountSid, authToken);

  const customOTP = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const { phoneNumber } = req.body;

  // await client.messages.create({
  //   body: `Your custom OTP is: ${customOTP}`,
  //   to: phoneNumber,
  //   from: "+1 659 299 2646",
  // });
  await Otp.findOneAndUpdate(
    { phoneNumber },
    {
      $set: {
        phoneNumber,
        // otp: customOTP,
        otp: 123456,
        otpExpiration: Date.now() + 10 * 60 * 1000, //set expire after 10min
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, `OTP Sent Successfully To ${phoneNumber}`));
});

const generateAccessToken = async (userId) => {
  try {
    const user = await Users.findById(userId);
    const AccessToken = user.generateAccessToken();
    user.accessToken = AccessToken;
    await user.save({ validateBeforeSave: false });
    return { AccessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went Wrong while generating Access Token"
    );
  }
};

const verifyOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    throw new ApiError(400, "PhoneNumber and OTP required");
  }

  const otpVerify = await Otp.findOne({ phoneNumber });

  if (!otpVerify) {
    throw new ApiError(402, "No Phone Number Found");
  }

  if (otpVerify.otp !== otp) {
    throw new ApiError(402, "OTP is wrong");
  }
  const otpExpirationTime = otpVerify.otpExpiration.getTime();
  const currentTime = Date.now();

  if (currentTime > otpExpirationTime) {
    throw new ApiError(402, "OTP has expired");
  }

  let user = await Users.findOne({ phoneNumber });
  if (!user) {
    user = await Users.create({
      name: `User${phoneNumber.substring(3, 8)}`,
      phoneNumber,
      gender,
      favouriteBooks: [],
      favouriteFlats: [],
      ownBooks: [],
      ownflats: [],
    });
  }

  const { AccessToken } = await generateAccessToken(user._id);

  const verifiedUser = await Users.findById(user._id).select("-accessToken");
  if (!verifiedUser) {
    throw new ApiError(402, "Something went wrong while creating user");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", AccessToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: verifiedUser,
          AccessToken,
        },
        "OTP is correct"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await Users.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        accessToken: "",
      },
    },
    {
      new: true,
    }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, "User Logout Successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  const updateData = req.body;

  if (!userId) {
    throw new ApiError(402, "UserId required to update user");
  }

  const updatedUser = await Users.findByIdAndUpdate(
    userId,
    {
      $set: updateData,
    },
    {
      new: true,
    }
  );
  if (!updateData) {
    throw new ApiError(404, "No user found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User Sucessfully updated"));
});

export { sendOpt, verifyOtp as verify, logoutUser as logout };
