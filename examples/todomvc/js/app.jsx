import React from 'react';
import { Cat, Container } from 'thundercats';
import { Router } from 'director';

import TodoStore from './stores/TodoStore';
import TodoActions from './actions/TodoActions';
import routes from './routes';
import RouterActions from './actions/RouterActions';
import TodoApp from './components/App.jsx';
import TodoService from './services/todoService';

class App extends Cat {
  constructor() {
    super();
    this.register(TodoActions);
    this.register(RouterActions);
    this.register(TodoStore, this);
  }
}

const app = new App();

const { changeRoute } = app.getActions('routerActions');

const router = Router({
  '/': function () {
    changeRoute(routes.ALL_TODOS);
  },
  '/active': function () {
    changeRoute(routes.ACTIVE_TODOS);
  },
  '/completed': function () {
    changeRoute(routes.COMPLETED_TODOS);
  }
});

router.init('/');

const appElement = (
  <Container>
    <TodoApp />
  </Container>
);

app.render(appElement, document.getElementById('todoapp')).subscribe(
  () => {
    console.log('app rendered!');
  },
  err => {
    console.log('rendering has encountered an err: ', err);
  }
);

TodoService.init(app.getStore('todoStore'));
