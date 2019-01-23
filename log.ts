import util from 'util'


const log = (text: string, data?: any) => {

    const { DEBUG } = process.env

    if (DEBUG === undefined) return

    console.dir(text, data, { colors: true })
    if (data === undefined) return
    console.log(util.inspect(data, { compact: false, depth: 5, breakLength: 80 }));


}

export { log as dqllog }