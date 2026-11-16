import { renderWidget, WidgetLocation } from '@remnote/plugin-sdk';
import { DocumentProgress } from '../components/DocumentProgress';

renderWidget(() => <DocumentProgress location={WidgetLocation.UnderRemEditor} />);
