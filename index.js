/**
 * @format
 */

import 'react-native-gesture-handler'; // 👈 SIEMPRE la primera línea del entry point
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
