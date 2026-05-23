import * as grpc from '@grpc/grpc-js';
import { UserService } from '../application/commands';


const userHandler = (userService: UserService) => ({

    Login : async (call: any, callback: any) => {
        try {
            const result = await userService.login(call.request.email, call.request.password);
            callback(null, result);    
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    Register : async (call: any, callback: any) => {
        try {
            const message = await userService.register(call.request.name, call.request.email, call.request.password);
            callback(null, { message });    
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    VerifyEmail : async (call: any, callback: any) => {
        try {
            const result = await userService.verifyEmail(call.request.token);
            callback(null, result);    
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    GoogleAuth : async (call: any, callback: any) => {
        try {
            const result = await userService.googleLogin(call.request, call.response);
            callback(null, result);    
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },
    GoogleCallback : async (call: any, callback: any) => {
        try {
            const result = await userService.googleCallback(call.request.code);
            callback(null, result);    
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },
});

export default userHandler;