import {programme} from '../../../lib/club-data';
import {json} from '../../../lib/admin-auth';
export async function GET(){try{return json(await programme())}catch{return json({error:'Unable to load the programme.'},503)}}
