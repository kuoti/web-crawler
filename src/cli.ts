#!/usr/bin/env node}
import dotenv from 'dotenv'
dotenv.config()


import * as logging from './util/logging'
import * as log4js from 'log4js'
import yargs, { ArgumentsCamelCase, exit } from "yargs";
import { explore } from './api/explore'
import { extract } from './api/extract';
import { ExecutionResultModel } from './api/models/explorer-result';
import { connectMongo } from './util/mongo';
import { listFilters } from './api/filter';
import { ExecutionResult } from './util/common';


const logger = log4js.getLogger()

function end(exitCode: number, error?) {
    if (error != null)
        logger.error(`Ending execution with error: `, error)
    else
        logger.info('Program ended')
    const { exit } = require('yargs')
    log4js.shutdown(() => {
        exit(exitCode)
    })
}

async function runPromiseAsync(method: (argv: ArgumentsCamelCase) => Promise<ExecutionResult>, argv: ArgumentsCamelCase) {
    logging.configure(argv.logLevel as string)
    await connectMongo()
    const executionResult = new ExecutionResultModel({ startedAt: new Date(), arguments: process.argv })
    await executionResult.save()
    const result = await method(argv)
    executionResult.endedAt = new Date()
    executionResult.result = result
    await executionResult.save()
}

function runPromise(method: (argv: ArgumentsCamelCase) => Promise<any>, argv: ArgumentsCamelCase) {
    runPromiseAsync(method, argv).then(() => end(0)).catch(e => end(1, e))
}


const argParser = yargs.scriptName('crawler').usage('$0 <task> [args]')
argParser.options('logLevel', {
    describe: 'Sets logging level', choices: ['all', 'mark', 'trace', 'debug', 'info', 'error', 'fatal', 'off'], default: 'info'
})


argParser.command("explore", "Finds new items to process later",
    { explorer: { describe: "Network key to process", string: true, demandOption: true } }, (argv: ArgumentsCamelCase) => {
        runPromise(explore, argv)
    })


argParser.command("extract", "Process all discovered items",
    { filter: { describe: "Network and filter to use while processing in the format 'network:filter'", string: true, demandOption: true } }, (argv: ArgumentsCamelCase) => {
        runPromise(extract, argv)
    })

argParser.command("filters", "List all available filters", {}, (argv: ArgumentsCamelCase) => {
    listFilters(argv).then(() => end(0)).catch(e => end(1, e))
})


argParser.demandCommand(1, 1)
argParser.parse()