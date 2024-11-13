import { Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
	ActivateUserRequest,
	CreateUserRequest,
	LoginRequest,
	SocialAuthRequest,
} from '../core/dto/user.dto';
import userModel from '../core/models/user.model';
import { IUser } from '../core/types/user.type';
import { APIError, BadRequestError } from '../core/utils/error/errors';
import { Responer } from '../core/utils/responer';
import { EmailService } from './email.service';
import { JwtService } from './jwt.service';

/** User Service */
export class UserService {
	constructor(
		private readonly _jwtService: JwtService,
		private readonly _emailService: EmailService,
	) {}

	/** create user */
	async createUser(body: CreateUserRequest) {
		try {
			const { name, email, password } = body;

			const isEmailExist = await userModel.findOne({ email });
			if (isEmailExist) throw new BadRequestError('Email already exist');

			const user = {
				name,
				email,
				password,
			};

			const activationToken = this._jwtService.createActivationToken(user);
			const activationCode = activationToken.activationCode;

			const data = { user: { name: user.name }, activationCode };

			await this._emailService.sendEmail({
				email: user.email,
				subject: 'Activate your account!',
				tempate: 'activation-mail.ejs',
				data,
			});

			return Responer({
				statusCode: 201,
				devMessage: 'Activation email sent successfully',
				message: `Please check your email: ${user.email} to activate your account!`,
				body: {
					activationToken: activationToken.token,
				},
			});
		} catch (error) {
			throw new APIError(`Error in creating user: ${error}`);
		}
	}

	/** activate uesr */
	async activateUser(body: ActivateUserRequest) {
		try {
			const { activation_token, activation_code } = body;

			const newUser = jwt.verify(
				activation_token,
				process.env.JWT_SECRET as string,
			) as { user: IUser; activationCode: string };

			if (newUser.activationCode !== activation_code) {
				throw new BadRequestError('Invalid Activation code');
			}

			const { name, email, password } = newUser.user;

			const existedUser = await userModel.findOne({ email });

			if (existedUser) {
				throw new BadRequestError(`Email already exist`);
			}

			const user = await userModel.create({
				name,
				email,
				password,
			});

			return Responer({
				statusCode: 201,
				devMessage: 'Activated and Registered User Success',
				message: `Registered account succcessfully`,
				body: user,
			});
		} catch (error) {
			throw new APIError(`Error in activating user: ${error}`);
		}
	}

	/** login user */
	async loginUser(body: LoginRequest, res: Response) {
		try {
			const { email, password } = body;

			const user = await userModel.findOne({ email }).select('+password');

			if (!user) {
				throw new BadRequestError('Invalid email or password');
			}

			const isPasswordMatch = await user.comparePassword(password);

			if (!isPasswordMatch) {
				throw new BadRequestError('Invalid password');
			}

			await this._jwtService.sendToken(user, 200, res);
		} catch (error) {
			throw new APIError(`Error in logging user : ${error}`);
		}
	}

	/** get user by Id */
	async getUserById(_id: string) {
		const objectId = new mongoose.Types.ObjectId(_id);
		const user = await userModel.findOne({
			_id: objectId,
		});
		return Responer({
			statusCode: 201,
			devMessage: 'get user by Id',
			message: `get user by Id success`,
			body: {
				user,
			},
		});
	}

	/** social auth */
	async socialAuth(
		body: SocialAuthRequest,
		res: Response | any,
	): Promise<void> {
		try {
			const { email, name, avatar } = body;
			const user = await userModel.findOne({ email });
			if (!user) {
				const newUser = await userModel.create({ name, email, avatar });
				await this._jwtService.sendToken(newUser, 200, res);
			} else {
				await this._jwtService.sendToken(user, 200, res);
			}
		} catch (error) {
			throw new APIError(`Error in social auth : %{error}`);
		}
	}
}
