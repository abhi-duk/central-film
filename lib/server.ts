import { readMysqlStore } from './store';
export async function getServerStore(){ return readMysqlStore(); }
