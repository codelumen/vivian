import { MessageContext } from "vk-io";
import Scene from "./scene";
import {
    CommandInfo,
    ICommand,
    CommandCallback,
    ArgumentValidator,
    IParser,
    ParserAdapter,
    ParserOutput,
    CommandScenePayload,
    CommandsCheckResponse
} from '../typings/command';
import Response from './response';
import { Validation } from '../config';
import OverloadedMap from './map';
import Member from "./member";


export class Parser<Interface> {
    public readonly alias: string | RegExp;
    public readonly adapter: ParserAdapter<Interface>;
    public readonly argumentsDelimiter: string | RegExp;
    public readonly arguments: ArgumentValidator[];


    constructor(data: IParser<Interface>) {
        Object.assign(data, {
            arguments: data.arguments || [],
            argumentsDelimiter: data.argumentsDelimiter || /.^/
        });
        Object.assign(this, data);
    }

    public async parse(message: MessageContext): Promise<Response | ParserOutput> {
        let messageText = message.text?.trim();
        let aliasString: string;
        let argumentString: string;
        if (!messageText) return;
        if (this.alias instanceof RegExp) {
            let exec = this.alias.exec(messageText);
            if (!exec) false;
            aliasString = exec[0];
            argumentString = messageText.substr(exec[0].length).trim();
        } else {
            if (!messageText.startsWith(this.alias)) return Validation.Command.Parser.Pass;
            argumentString = messageText.substr(this.alias.length).trim();
        }
        let args = argumentString.split(this.argumentsDelimiter).filter(e => e);
        if (this.arguments.length) {
            if (args.length < this.arguments.length) return Validation.Command.Parser.Failed;
            await args.forEach(async (arg, i) => {
                if (i > this.arguments.length) return;
                let test = await this.arguments[i](arg, message);
                if (!test) return Validation.Command.Parser.Failed;
            });
        }
        return {
            alias: aliasString,
            arguments: args
        } as ParserOutput;
    }
}

export class Command<InputInterface> {
    public readonly id: string;
    public readonly info: CommandInfo;
    public readonly parsers: Parser<InputInterface>[];
    public readonly permissions: string[];
    public readonly callback: CommandCallback<InputInterface>;

    public static list = new OverloadedMap<string, Command<any>>();

    constructor(data: ICommand<InputInterface>) {
        Object.assign(this, data);
    }

    public static async check(message: MessageContext): Promise<CommandsCheckResponse> {
        for (let command of this.list.all()) {
            let response = await command.use(message);
            if (response !== Validation.Command.Use.Pass) {
                return {
                    command: command,
                    response: response
                } as CommandsCheckResponse;
            }
        }
    }

    public execute(message: MessageContext, input: InputInterface) {
        if (typeof this.callback === 'function') {
            this.callback(message, input);
        } else if (this.callback instanceof Scene) {
            this.callback.enterCurrentFrame({
                message: message,
                input: input
            } as CommandScenePayload<InputInterface>);
        }
    }

    public displayInfo() {
        return `💬 Помощь по команде:\n${this.info.usage}\n${this.info.description}`;
    }

    public async use(message: MessageContext): Promise<Response> {
        for (let parser of this.parsers) {
            let parsed = await parser.parse(message);
            if (parsed === Validation.Command.Parser.Pass) {
                continue;
            }
            if (parsed === Validation.Command.Parser.Failed) {
                return Validation.Command.Use.Failed;
            }
            let parserOutput = parsed as ParserOutput;
            let member = Member.list.get(message.senderId);
            if (!member.hasPermissions(this.permissions)) {
                return Validation.Command.Use.Denied;
            }
            this.execute(message, parser.adapter(parserOutput));
        }
        return Validation.Command.Use.Pass;
    }
}