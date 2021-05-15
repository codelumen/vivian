import { Command, Parser } from '../models/command';
import Response from '../models/response';
import { MessageContext } from "vk-io";
import Scene from "../models/scene";


export type ParserAdapter<InputInterface> = (data: ParserOutput) => InputInterface;

export type ArgumentValidator = (argumentString: string, message?: MessageContext) => boolean;

export interface IParser<InputInterface> {
    alias: string | RegExp,
    adapter: ParserAdapter<InputInterface>,
    arguments?: ArgumentValidator[],
    argumentsDelimiter?: string | RegExp,
}

export interface ParserOutput {
    alias: string,
    arguments: string[]
};


export type InputCallback<InputInterface> = (message: MessageContext, input: InputInterface) => void;

export type CommandCallback<InputInterface>  = Scene | InputCallback<InputInterface>;

export interface CommandInfo {
    usage: string,
    description: string
}

export interface ICommand<InputInterface> {
    id: string,
    info: CommandInfo,
    parsers: Parser<InputInterface>[]
    permissions: string[],
    callback: CommandCallback<InputInterface>
}

export interface CommandsCheckResponse {
    command: Command<any>,
    response: Response
}

export interface CommandScenePayload<InputInterface> {
    message: MessageContext,
    input: InputInterface
}