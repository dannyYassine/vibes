import './styles.css';
import { bootstrap } from '@/infra/container/bootstrap';
import { GrooveboxPresenter } from '@/features/groovebox/presentation/GrooveboxPresenter';
import { GrooveboxView } from '@/features/groovebox/presentation/GrooveboxView';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('VOLTAGE: #app root is missing');

const container = bootstrap();
const presenter = container.resolve<GrooveboxPresenter>('grooveboxPresenter');
const view = new GrooveboxView(presenter);
view.mount(root);
