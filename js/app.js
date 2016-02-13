(function (window) {
	'use strict';
  var Ripples = function (initialState, setStateCallback) {
    this.state = initialState;
    this.events = {};
    this.ripples = {};
    this.setStateCallback = setStateCallback;
    for (var key in state) {
      var eventName = 'update' + key;
      this.events[eventName] = new Event(eventName);
      this.ripples[eventName] = [];
    }
  }
  Ripples.prototype.setState = function (obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        ripples.state[key] = obj[key];
        var eventName = 'update' + key;
        this.ripples[eventName].forEach(function (ele) {
          ele.dispatchEvent(this.events[eventName]);
        }.bind(this));
      }
    }
    if (typeof this.setStateCallback === 'function')
      this.setStateCallback();
  }
  Ripples.prototype.ripple = function (events, elements, handler) {
    if (!Array.isArray(events))
      events = [events];
    if (!Array.isArray(elements))
      elements = [elements];
    events.forEach(function (event) {
      elements.forEach(function (element) {
        element.addEventListener(event, handler);
        this.ripples[event].push(element);
      }.bind(this));
    }.bind(this));
  }
  Ripples.prototype.render = function (template) {
    var docFrag = document.createDocumentFragment();
    template.forEach(function (subTemp) {
      var tag = subTemp[0], params = subTemp[1], children = subTemp[2];
      var element = document.createElement(tag);
      for (var key in params)
        element[key] = params[key];
      if (typeof children === 'object') {
        var childFrag = this.render(children);
        element.appendChild(childFrag);
      } else {
        element.innerHTML = children;
      }
      docFrag.appendChild(element);
    }.bind(this));
    return docFrag;
  }
  // Initialization
  var state = {
    todos: [],
    filter: 0,
    text: ''
  }
  var persistTodos = function () {
    var todos = ripples.state.todos;
    var filter = ripples.state.filter;
    localStorage.setItem('todos-ripples', JSON.stringify({
      todos: todos,
      filter: filter
    }));
  }
  var ripples = new Ripples(state, persistTodos);
  var filters = document.querySelectorAll('.filters li');
  var refs = {
    input: document.querySelector('.new-todo'),
    list: document.querySelector('.todo-list'),
    main: document.querySelector('.main'),
    footer: document.querySelector('.footer'),
    toggle: document.querySelector('.toggle-all'),
    counter: document.querySelector('.todo-count'),
    all: filters[0],
    active: filters[1],
    completed: filters[2],
    clear: document.querySelector('.clear-completed')
  }
  // Templates
  var todoTemplate = function (todo) {
    var klass = todo.completed ? 'completed' : '';
    return (
      ['li', {className: klass}, [
        ['div', {className: 'view'}, [
          ['input', {className: 'toggle', type: 'checkbox', checked: todo.completed}, ''],
          ['label', {}, todo.text],
          ['button', {className: 'destroy'}, '']]
        ],
        ['input', {className: 'edit', value: todo.text}, '']]
      ]
    );
  }
  var counterTemplate = function (count) {
    var phrase = count === 1 ? ' item left' : ' items left';
    return [
      ['strong', {}, count],
      ['span', {}, phrase]
    ];
  }
  // Reactions
  var listReaction = function () {
    var filter = ripples.state.filter;
    if (filter === 0) {
      var template = ripples.state.todos.map(todoTemplate);
    } else {
      var template = ripples.state.todos.filter(function (todo) {
        if (filter === 1)
          return !todo.completed;
        else
          return todo.completed;
      }).map(todoTemplate);
    }
    var newList = ripples.render(template);
    refs.list.innerHTML = '';
    refs.list.appendChild(newList);
  }
  var displayReaction = function () {
    var len = ripples.state.todos.length;
    var display = this.style.display;
    if (len === 0 && display !== 'none') {
      this.style.display = 'none';
    } else if (len > 0 && display !== 'block') {
      this.style.display = 'block';
    }
  }
  var countReaction = function () {
    var active = ripples.state.todos.filter(function (todo) {
      return !todo.completed;
    });
    var newCounter = ripples.render(counterTemplate(active.length));
    refs.counter.innerHTML = '';
    refs.counter.appendChild(newCounter);
  }
  var selectedFilterReaction = function (e) {
    var i = 0;
    var anchor = this.querySelector('a');
    var node = this;
    while (node = node.previousSibling)
      if (node.nodeType === 1) i += 1;
    if (i === ripples.state.filter && !anchor.classList.contains('selected')) {
      anchor.classList.add('selected');
    } else if (i !== ripples.state.filter && anchor.classList.contains('selected')) {
      anchor.classList.remove('selected');
    }
  }
  var highlightToggleReaction = function () {
    var todos = ripples.state.todos;
    var completed = todos.filter(function (todo) {
      return todo.completed;
    });
    if (completed.length === todos.length && this.checked === false) {
      this.checked = true;
    } else if (completed.length !== todos.length && this.checked === true) {
      this.checked = false;
    }
  }
  // Handlers
  var dblClick = false;
  var clickTimeout = null;
  var listActionHandler = function (e) {
    var target = e.target;
    if (target.parentNode.tagName !== 'DIV')
      return;
    var i = 0;
    var parent = target.parentNode.parentNode;
    var node = parent;
    while (node = node.previousSibling)
      if (node.nodeType === 1) i += 1;
    switch (target.tagName) {
    case 'BUTTON': // delete
      ripples.setState({todos: ripples.state.todos.filter(function (_, j) {
        return j !== i;
      })});
      break;
    case 'INPUT': // complete
      var newTodos = ripples.state.todos.slice();
      newTodos[i].completed = !newTodos[i].completed;
      ripples.setState({todos: newTodos});
      break;
    case 'LABEL': // edit
      if (clickTimeout === null) {
        dblClick = true;
        clickTimeout = setTimeout(function () {
          dblClick = false;
          clickTimeout = null;
        }, 300);
        return;
      }
      if (dblClick && !parent.classList.contains('completed')) {
        parent.classList.add('editing');
        var input = parent.querySelector('.edit');
        input.focus();
        function stopEditing() {
          var newTodos = ripples.state.todos.slice();
          newTodos[i].text = input.value;
          ripples.setState({todos: newTodos});
          window.removeEventListener('click', detectClickOff);
          input.removeEventListener('keyup', submit);
        }
        function detectClickOff(e) {
          if (e.target !== input) {
            stopEditing();
          }
        }
        function submit(e) {
          if (event.which == 13 || event.keycode == 13) {
            stopediting();
          }
        }
        setTimeout(function () {
          window.addEventListener('click', detectClickOff);
          input.addEventListener('keyup', submit);
        });
      }
      break;
    }
  }
  var clearHandler = function () {
    var newTodos = ripples.state.todos.filter(function (todo) {
      return !todo.completed;
    });
    ripples.setState({todos: newTodos});
  }
  var inputHandler = function (e) {
    if ((e.which == 13 || e.keycode == 13) && this.value !== '') {
      var newTodo = {text: this.value.trim(), completed: false}
      var newTodos = [newTodo].concat(ripples.state.todos);
      ripples.setState({todos: newTodos});
      this.value = '';
    }
  }
  var filterHandler = function (e) {
    setTimeout(function() {
      switch (window.location.hash) {
      case '#/active':
        if (ripples.state.filter !== 1)
          ripples.setState({filter: 1});
        break;
      case '#/completed':
        if (ripples.state.filter !== 2)
          ripples.setState({filter: 2});
        break;
      default:
        if (ripples.state.filter !== 0)
          ripples.setState({filter: 0});
      }
    });
  }
  var toggleHandler = function (e) {
    setTimeout(function() {
      var newTodos = ripples.state.todos.slice();
      newTodos.forEach(function (todo) {
        todo.completed = this.checked;
      }.bind(this));
      ripples.setState({todos: newTodos});
    }.bind(this));
  }
  // Main
  ripples.ripple(['updatetodos', 'updatefilter'], refs.list, listReaction);
  ripples.ripple('updatetodos', [refs.main, refs.footer], displayReaction);
  ripples.ripple('updatetodos', refs.counter, countReaction);
  ripples.ripple('updatetodos', refs.toggle, highlightToggleReaction);
  ripples.ripple('updatefilter', [refs.all, refs.active, refs.completed], selectedFilterReaction);
  refs.list.addEventListener('click', listActionHandler);
  refs.clear.addEventListener('click', clearHandler);
  refs.input.addEventListener('keyup', inputHandler);
  refs.all.addEventListener('click', filterHandler);
  refs.active.addEventListener('click', filterHandler);
  refs.completed.addEventListener('click', filterHandler);
  refs.toggle.addEventListener('click', toggleHandler);
  window.addEventListener('popstate', filterHandler);
  var data = localStorage.getItem('todos-ripples');
  if (data !== null) {
    data = JSON.parse(data);
    ripples.setState({todos: data.todos, filter: data.filter});
  } else {
    ripples.setState({todos: [], filter: 0});
  }
  filterHandler();
})(window);
