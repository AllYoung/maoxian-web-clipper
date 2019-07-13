
"use strict";
(function(){
  const ID = 'mx-wc-iframe-control';

  const ID_SWITCH_BTN    = 'switch-btn';
  const CLASS_STATE_BAR  = 'state-bar';
  const CLASS_HINT       = 'hint';

  const ID_FORMAT        = 'format';
  const ID_TITLE         = "title";
  const ID_CATEGORY      = "category";
  const ID_TAGSTR        = "tagstr";
  const CLASS_FORM       = "save-form";
  const CLASS_SAVE_BTN   = 'save-button';
  const CLASS_CANCEL_BTN = 'cancel-button';
  const INPUT_TAG_NAMES = ['INPUT', 'TEXTAREA'];
  const CLASS_FORM_INPUTS = ['save-form', 'input-group', 'actions'];

  function initUI(){
    const gbox = T.queryElem('.gbox');
    const uiHtml = T.findElem('ui-tpl').innerHTML;
    T.setHtml(gbox, uiHtml);
    i18nPage();
    setTimeout(initUIListener, 0);
  }

  function initUIListener() {
    const btn = getEntryBtn();
    const saveBtn = T.firstElem(CLASS_SAVE_BTN);
    const cancelBtn = T.firstElem(CLASS_CANCEL_BTN);
    const tagstrInput = T.findElem(ID_TAGSTR);
    T.bindOnce(btn, 'click', entryClick);

    const bar = getStateBar();
    MxWcConfig.load().then((config) => {
      // "c" hotkey
      if(config.hotkeySwitchEnabled) {
        T.bindOnce(document, "keydown", toggleSwitch);
      }

      if(config.mouseModeEnabled && bar) {
        bar.classList.add('mouse-friendly')
        const helperPanel = T.firstElem('help');
        helperPanel.classList.add('mouse-friendly');
        //bind kbd listener
        T.bindOnce(helperPanel, 'click', keyboardClicked);
      }

      // mobile ui
      const opBtnPanel = T.queryElem('.op-btn-panel');
      T.bindOnce(opBtnPanel, 'click', keyboardClicked);
    });

    // show help hint to new user.
    MxWcStorage.get('categories', [])
      .then((v) => {
        if(v.length == 0 && bar){
          bar.classList.add('new-user');
        }
      })

    T.bindOnce(saveBtn     , 'click'    , saveForm);
    T.bindOnce(cancelBtn   , 'click'    , cancelForm);
    T.bindOnce(saveBtn     , 'keypress' , formEnterKeyHandler);
    T.bindOnce(cancelBtn   , 'keypress' , formEnterKeyHandler);
    T.bindOnce(tagstrInput , 'keypress' , formEnterKeyHandler);


    window.focus();
  }

  function keyboardClicked(e) {
    if(e.target.tagName === 'KBD') {
      const keyCode = parseInt(e.target.getAttribute('data-key-code'));
      if(keyCode > -2000) {
        // webpage relative event
        sendKeyPressMessage(keyCode);
      } else {
        // other key
        switch(keyCode) {
          case -2001: toggleOpBtnGroup(); break;
          case -2002: showHelpModal();break;
        }
      }
    }
  }

  // mobile op buttons
  function toggleOpBtnGroup() {
    const klass = 'show';
    const [groupB, groupC] =T.queryElems(".op-btn-group.group-b,.op-btn-group.group-c");
    groupB.classList.toggle(klass)
    groupC.classList.toggle(klass)
  }

  function showHelpModal() {
    const modal = T.queryElem('.help-modal');
    modal.style.display = 'block';
    T.bindOnce(modal, 'click', helpModalClicked);
  }

  function helpModalClicked(e) {
    const modal = T.queryElem('.help-modal');
    modal.style.display = 'none';
    stopEvent(e);
  }

  function initFrameMsg(){
    const topWindowOrigin = atob(window.location.search.split('=')[1]);
    FrameMsg.init({
      id: ID,
      origin: window.location.origin,
      allowOrigins: [topWindowOrigin]
    });
  }

  function listenFrameMsg(){
    FrameMsg.addListener('bindListener', bindListener);
    FrameMsg.addListener('unbindListener', unbindListener);
    FrameMsg.addListener('unbindMouseMove', unbindMouseMove);
    FrameMsg.addListener('setStateIdle', setStateIdle);
    FrameMsg.addListener('setStateSelecting', setStateSelecting);
    FrameMsg.addListener('setStateSelected', setStateSelected);
    FrameMsg.addListener('setStateConfirmed', setStateConfirmed);
    FrameMsg.addListener('setStateClipping', setStateClipping);
    FrameMsg.addListener('setSavingStateStarted', setSavingStateStarted);
    FrameMsg.addListener('setSavingStateProgress', setSavingStateProgress);
    FrameMsg.addListener('setSavingStateCompleted', setSavingStateCompleted);
    FrameMsg.addListener('showForm', showForm);
    FrameMsg.addListener('hideForm', hideForm);
    FrameMsg.addListener('destroy', destroy);
  }

  /************** event listener ****************/

  function bindListener(msg) {
    T.bind(document, 'mousemove', mouseMoveHandler, true);
    T.bind(document, 'click', clickHandler, true);
    T.bind(document, 'keydown', keyDownHandler, true);
  };

  function unbindListener(msg) {
    unbindMouseMove();
    T.unbind(document, 'click', clickHandler, true);
    T.unbind(document, 'keydown', keyDownHandler, true);
  }

  function unbindMouseMove(msg){
    T.unbind(document, 'mousemove', mouseMoveHandler, true);
  }

  function mouseMoveHandler(e) {
    sendFrameMsgToTop('mousemove', {x: e.clientX, y: e.clientY});
  }

  function clickHandler(e) {
    if(['HTML', 'BODY'].indexOf(e.target.nodeName) > -1){
      sendFrameMsgToTop('click', {x: e.clientX, y: e.clientY});
    }
  }

  function keyDownHandler(e) {
    const keyCodes = [27, 13, 37, 46, 38, 39, 40];
    if(keyCodes.indexOf(e.keyCode) < 0) { return }
    if(!INPUT_TAG_NAMES.includes(e.target.tagName) && !CLASS_FORM_INPUTS.includes(e.target.parentNode.className)){
      sendKeyPressMessage(e.keyCode);
    }else{
      Log.debug(e.target.tagName);
    }
  }

  function sendKeyPressMessage(keyCode) {
    let type = null;
      switch(keyCode){
        case 27 : type = 'pressEsc'   ; break ;
        case 13 : type = 'pressEnter' ; break ;
        case 46 : type = 'pressDelete'; break ;
        case 37 : type = 'pressLeft'  ; break ;
        case 38 : type = 'pressUp'    ; break ;
        case 39 : type = 'pressRight' ; break ;
        case 40 : type = 'pressDown'  ; break ;
        /* custom keyCode :) */
        case -1001 : type = 'clickSelectedArea' ; break;
      }
      sendFrameMsgToTop(type);
  }

  function toggleSwitch(e){
    if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey){ return }
    // 67 keyCode of 'c'
    if(e.keyCode != 67){ return }
    if(e.target.tagName === 'BODY'){
      entryClick();
    }else{
      // console.log(e.target.tagName);
    }
  }

  function entryClick(){
    sendFrameMsgToTop('entryClick');
  }

  /************** change state ****************/

  function setStateIdle(msg){
    const gbox = getGbox();
    const btn = getEntryBtn();
    btn.title = t('switch.title');
    gbox.classList.remove('selected');
    gbox.classList.remove('selecting');
    gbox.classList.remove('confirmed');
    gbox.classList.remove('clipping');
    gbox.classList.remove('saving');
    gbox.classList.add('idle');
    setHint('-');
  }
  function setStateSelecting(msg){
    const gbox = getGbox();
    const btn = getEntryBtn();
    btn.innerText = "ON";
    btn.title = t('switch.title');
    gbox.classList.remove('idle');
    gbox.classList.add('selecting');
    setHint(t('hint.selecting'));
  }
  function setStateSelected(msg){
    const gbox = getGbox();
    const btn = getEntryBtn();
    btn.innerText = "ON";
    btn.title = t('switch.title');
    gbox.classList.remove('selecting');
    gbox.classList.add('selected');
    setHint(t('hint.selected'));
  }
  function setStateConfirmed(msg){
    const gbox = getGbox();
    gbox.classList.remove('selecting');
    gbox.classList.remove('selected');
    gbox.classList.add('confirmed');
    setHint('-');
  }
  function setStateClipping(msg){
    const gbox = getGbox();
    gbox.classList.remove('confirmed');
    gbox.classList.add('clipping');
    setHint(t('hint.clipping'));
  }

  /************** change saving state ****************/


  function setSavingStateStarted(msg) {
    const gbox = getGbox();
    gbox.classList.remove('clipping');
    gbox.classList.add('saving');
    setHint(t('hint.saving.started'));
  }

  function setSavingStateProgress(msg) {
    let hint = t('hint.saving.progress')
    hint = hint.replace('$finished', msg.finished).replace('$total', msg.total);
    setHint(hint);
  }

  function setSavingStateCompleted(msg) {
    setHint(t('hint.saving.completed'));
  }

  function setHint(text){
    const elems = T.queryElems(`.${CLASS_HINT}`)
    T.each(elems, function(elem) {
      T.setHtml(elem, text);
    });
  }

  function getContextNode() {
    let elem = T.firstElem('desktop');
    if(T.isElemVisible(window, elem)) {
      return elem;
    }
    return T.firstElem('mobile');
  }

  /************** Form relative ****************/

  function formEnterKeyHandler(e){
    if(e.keyCode === 13){
      e.preventDefault();
      if(e.target.classList.contains(CLASS_CANCEL_BTN)){
        cancelForm();
      }else{
        saveForm();
      }
      stopEvent(e);
    }
  }

  async function initSaveFormatOption(formatOption) {
    const config = await MxWcConfig.load();
    T.bind(formatOption, 'click', (e) => {
      if(e.target.tagName === 'A'){
        const value = e.target.getAttribute('data-value');
        updateOptionsState(formatOption, value)
      }
    });
    updateOptionsState(formatOption, config["saveFormat"]);

    function updateOptionsState(elem, value) {
      T.each(elem.children, (option) => {
        option.classList.remove('active');
        const optionValue = option.getAttribute('data-value');
        if(optionValue === value){
          option.classList.add('active');
        }
      });
    }
  }

  async function showForm(msg){
    Log.debug('showForm');
    const form = T.firstElem(CLASS_FORM);
    if(form.style.display == 'block'){ return false}
    setStateConfirmed();
    form.style.display = 'block';
    const formatBlock = T.findElem(ID_FORMAT);
    const titleInput = T.findElem(ID_TITLE);
    const categoryInput = T.findElem(ID_CATEGORY);
    const tagstrInput = T.findElem(ID_TAGSTR);

    await initSaveFormatOption(formatBlock);
    titleInput.value = msg.title;
    categoryInput.value= msg.category;
    tagstrInput.value = msg.tagstr;
    MxWc.form.clearAutoComplete();
    MxWcStorage.get('categories', [])
      .then((v) => {
        MxWc.form.categoryAutoComplete = new Lib.Awesomplete(categoryInput, {
          autoFirst: true,
          minChars: 1,
          list: v
        })
        if(msg.category === ''){
          categoryInput.focus();
        }
      })
    MxWcStorage.get('tags', [])
      .then((v) => {
        MxWc.form.tagstrAutoComplete =  new Lib.Awesomplete(tagstrInput, {
          autoFirst: true,
          minChars: 1,
          list: v,
          filter: function(text, input) {
            return Lib.Awesomplete.FILTER_CONTAINS(text, input.match(/[^ ,，]*$/)[0]);
          },

          item: function(text, input) {
            return Lib.Awesomplete.ITEM(text, input.match(/[^ ,，]*$/)[0]);
          },

          replace: function(text) {
            const before = this.input.value.match(/^.+[ ,，]{1}\s*|/)[0];
            this.input.value = before + text + " ";
          }
        });
        if(msg.category !== '') {
          tagstrInput.focus();
        }
      })
    return true;
  }

  function saveForm(){
    hideForm();
    unbindListener();

    const formatBlock = T.findElem(ID_FORMAT);
    const titleInput = T.findElem(ID_TITLE);
    const categoryInput = T.findElem(ID_CATEGORY);
    const tagstrInput = T.findElem(ID_TAGSTR);

    sendFrameMsgToTop('startClip', {
      format: formatBlock.querySelector(".active").getAttribute('data-value'),
      title: titleInput.value,
      category: categoryInput.value,
      tagstr: tagstrInput.value,
    })
  }

  function cancelForm(){
    hideForm();
    sendFrameMsgToTop('cancelForm');
  }

  function hideForm(msg){
    Log.debug('hideForm');
    T.firstElem(CLASS_FORM).style.display = 'none';
  }

  function destroy(msg) {
    sendFrameMsgToTop('frame.control.removeMe');
  }

  /************** Find Element ****************/
  function getGbox() {
    return T.queryElem(".gbox");
  }
  function getStateBar(){
    const node = getContextNode();
    return T.firstElem(CLASS_STATE_BAR, node);
  }
  function getEntryBtn(){
    return T.findElem(ID_SWITCH_BTN);

  }


  /************** Others ****************/

  function stopEvent(e){
    e.stopPropagation();
    e.preventDefault();
  }

  function sendFrameMsgToTop(type, msg){
    FrameMsg.send({ to: 'top', type: type, msg: (msg || {}) });
  }


  const MxWc = {}
  MxWc.form = {
    categoryAutoComplete: null,
    tagstrAutoComplete: null,
    clearAutoComplete: function(){
      if(this.categoryAutoComplete){
        this.categoryAutoComplete.destroy();
        this.categoryAutoComplete = null;
      }
      if(this.tagstrAutoComplete){
        this.tagstrAutoComplete.destroy();
        this.tagstrAutoComplete = null;
      }
    }
  }
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1408996
  // save reference
  const Lib = {
    Awesomplete: window.Awesomplete
  }

  initUI();
  initFrameMsg();
  listenFrameMsg();
  Log.info('control layer ready..');
})();
