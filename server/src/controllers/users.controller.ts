import { NextFunction, Request, Response } from 'express';
import { catchAsyncErrors } from '../core/decorators/catcy-async-errrors.decorator';
import { ActivateUserRequest, CreateUserRequest } from '../core/dto/user.dto';
import { RequestValidator } from '../core/utils/error/request-validator';
import { logger } from '../core/utils/logger';
import { Responer } from '../core/utils/responer';
import { EmailService } from '../services/email.service';
import { JwtService } from '../services/jwt.service';
import { UserService } from '../services/users.service';

/**
 * User Controllers
 */
class UserControllers {
	constructor(private readonly userService: UserService) {
		this.registerUser = this.registerUser.bind(this);
		this.activeUser = this.activeUser.bind(this);
	}

	@catchAsyncErrors()
	public async registerUser(
		req: Request,
		res: Response | any,
		next: NextFunction,
	) {
		const { errors, input } = await RequestValidator(
			CreateUserRequest,
			req.body,
		);

		if (errors) {
			return res.status(400).json(
				Responer({
					statusCode: 400,
					message: errors as string,
					devMessage: 'Your Request is invalid',
					body: {},
				}),
			);
		}

		try {
			const result = await this.userService.createUser(input);
			return res.status(201).json(result);
		} catch (error: any) {
			logger.error(`Errors at register user : ${error.message}`);
			return res.status(500).json(
				Responer({
					statusCode: 500,
					message: error,
					devMessage: `Something went wrong in Creating User`,
					body: {},
				}),
			);
		}
	}

	@catchAsyncErrors()
	public async activeUser(
		req: Request,
		res: Response | any,
		next: NextFunction,
	) {
		const { errors, input } = await RequestValidator(
			ActivateUserRequest,
			req.body,
		);

		if (errors) {
			return res.status(400).json(
				Responer({
					statusCode: 400,
					message: errors as string,
					devMessage: 'Your Request is invalid',
					body: {},
				}),
			);
		}

		try {
			const result = await this.userService.activateUser(input);
			return res.status(201).json(result);
		} catch (error: any) {
			logger.error(`Errors at activating user : ${error.message}`);
			return res.status(500).json(
				Responer({
					statusCode: 500,
					message: error,
					devMessage: `Something went wrong in Activating User`,
					body: {},
				}),
			);
		}
	}
}

const jwtService = new JwtService();
const emailService = new EmailService();
const userService = new UserService(jwtService, emailService);
export const userController = new UserControllers(userService);
