import angular from 'angular';
import '../../app.module.js'; // Ensure the module is loaded

angular.module('vibgyorChat').controller('ChatController', ['$scope', '$timeout', 'AuthService', 'UserService', 'ChatService', 'SocketService', 'ThemeService', 'ToastService', 'FileService', function($scope, $timeout, AuthService, UserService, ChatService, SocketService, ThemeService, ToastService, FileService) {

  $scope.currentUser = null;
  $scope.contacts = [];
  $scope.filteredContacts = [];
  $scope.selectedContact = null;
  $scope.messages = [];
  $scope.messageInput = ''; // Initialize messageInput as empty string
  $scope.searchQuery = '';
  $scope.filter = 'all';
  $scope.typingUsers = {};
  $scope.loading = true;
  $scope.ThemeService = ThemeService;
  $scope.ChatService = ChatService; // Make ChatService available in scope
  $scope.showProfilePopup = false;
  $scope.editingProfile = false;
  $scope.editForm = {
    name: '',
    username: '',
    profile_picture: null,
    profilePicturePreview: null
  };
  $scope.usernameAvailable = null;
  $scope.checkingUsername = false;
  $scope.usernameCheckTimeout = null;

  // Search related variables
  $scope.searchResults = {
    contacts: [],
    global: []
  };
  $scope.isSearching = false;
  $scope.searchTimeout = null;
  $scope.addingToContacts = {}; // Track loading state for each user
  $scope.sidebarView = 'chats'; // Default sidebar view
  $scope.contextMenu = {
    show: false,
    contact: null,
    x: 0,
    y: 0
  };
  $scope.showDeleteConfirmation = false;
  $scope.deleteContact = null;
  $scope.showAttachmentMenu = false;
  $scope.sendingMessage = false;
  $scope.uploadingFile = false;
  $scope.socketConnected = false;
  $scope.loadingMessages = false;
  $scope.loadingOlderMessages = false;

  // Emoji picker variables
  $scope.showEmojiPicker = false;
  $scope.emojiTab = 'emoji';
  $scope.emojiCategory = 'people';
  $scope.emojiSearch = '';
  $scope.gifSearch = '';
  $scope.searchResults = [];
  $scope.trendingGifs = [];
  $scope.searchingGifs = false;

  // Emoji categories and data
  $scope.emojiCategories = [
    { id: 'people', name: 'Smileys & People', icon: '😀' },
    { id: 'nature', name: 'Animals & Nature', icon: '🌿' },
    { id: 'food', name: 'Food & Drink', icon: '🍎' },
    { id: 'activity', name: 'Activity', icon: '⚽' },
    { id: 'travel', name: 'Travel & Places', icon: '🚗' },
    { id: 'objects', name: 'Objects', icon: '💡' },
    { id: 'symbols', name: 'Symbols', icon: '❤️' },
    { id: 'flags', name: 'Flags', icon: '🏁' }
  ];

  $scope.emojis = {
    people: [
      { char: '😀', name: 'grinning face' },
      { char: '😃', name: 'grinning face with big eyes' },
      { char: '😄', name: 'grinning face with smiling eyes' },
      { char: '😁', name: 'beaming face with smiling eyes' },
      { char: '😆', name: 'grinning squinting face' },
      { char: '😅', name: 'grinning face with sweat' },
      { char: '🤣', name: 'rolling on the floor laughing' },
      { char: '😂', name: 'face with tears of joy' },
      { char: '🙂', name: 'slightly smiling face' },
      { char: '🙃', name: 'upside-down face' },
      { char: '😉', name: 'winking face' },
      { char: '😊', name: 'smiling face with smiling eyes' },
      { char: '😇', name: 'smiling face with halo' },
      { char: '🥰', name: 'smiling face with hearts' },
      { char: '😍', name: 'smiling face with heart-eyes' },
      { char: '🤩', name: 'star-struck' },
      { char: '😘', name: 'face blowing a kiss' },
      { char: '😗', name: 'kissing face' },
      { char: '😚', name: 'kissing face with closed eyes' },
      { char: '😙', name: 'kissing face with smiling eyes' },
      { char: '😋', name: 'face savoring food' },
      { char: '😛', name: 'face with tongue' },
      { char: '😜', name: 'winking face with tongue' },
      { char: '🤪', name: 'zany face' },
      { char: '😝', name: 'squinting face with tongue' },
      { char: '🤑', name: 'money-mouth face' },
      { char: '🤗', name: 'hugging face' },
      { char: '🤭', name: 'face with hand over mouth' },
      { char: '🤫', name: 'shushing face' },
      { char: '🤔', name: 'thinking face' },
      { char: '🤐', name: 'zipper-mouth face' },
      { char: '🤨', name: 'face with raised eyebrow' },
      { char: '😐', name: 'neutral face' },
      { char: '😑', name: 'expressionless face' },
      { char: '😶', name: 'face without mouth' },
      { char: '😏', name: 'smirking face' },
      { char: '😒', name: 'unamused face' },
      { char: '🙄', name: 'face with rolling eyes' },
      { char: '😬', name: 'grimacing face' },
      { char: '🤥', name: 'lying face' },
      { char: '😔', name: 'pensive face' },
      { char: '😪', name: 'sleepy face' },
      { char: '🤤', name: 'drooling face' },
      { char: '😴', name: 'sleeping face' },
      { char: '😷', name: 'face with medical mask' },
      { char: '🤒', name: 'face with thermometer' },
      { char: '🤕', name: 'face with head-bandage' },
      { char: '🤢', name: 'nauseated face' },
      { char: '🤮', name: 'face vomiting' },
      { char: '🤧', name: 'sneezing face' },
      { char: '🥵', name: 'hot face' },
      { char: '🥶', name: 'cold face' },
      { char: '🥴', name: 'woozy face' },
      { char: '😵', name: 'dizzy face' },
      { char: '🤯', name: 'exploding head' },
      { char: '🤠', name: 'cowboy hat face' },
      { char: '🥳', name: 'partying face' },
      { char: '😎', name: 'smiling face with sunglasses' },
      { char: '🤓', name: 'nerd face' },
      { char: '🧐', name: 'face with monocle' }
    ],
    nature: [
      { char: '🐶', name: 'dog face' },
      { char: '🐱', name: 'cat face' },
      { char: '🐭', name: 'mouse face' },
      { char: '🐹', name: 'hamster face' },
      { char: '🐰', name: 'rabbit face' },
      { char: '🦊', name: 'fox face' },
      { char: '🐻', name: 'bear face' },
      { char: '🐼', name: 'panda face' },
      { char: '🐨', name: 'koala' },
      { char: '🐯', name: 'tiger face' },
      { char: '🦁', name: 'lion face' },
      { char: '🐮', name: 'cow face' },
      { char: '🐷', name: 'pig face' },
      { char: '🐸', name: 'frog face' },
      { char: '🐵', name: 'monkey face' },
      { char: '🙈', name: 'see-no-evil monkey' },
      { char: '🙉', name: 'hear-no-evil monkey' },
      { char: '🙊', name: 'speak-no-evil monkey' },
      { char: '🐒', name: 'monkey' },
      { char: '🐔', name: 'chicken' },
      { char: '🐧', name: 'penguin' },
      { char: '🐦', name: 'bird' },
      { char: '🐤', name: 'baby chick' },
      { char: '🐣', name: 'hatching chick' },
      { char: '🐥', name: 'front-facing baby chick' },
      { char: '🦆', name: 'duck' },
      { char: '🦅', name: 'eagle' },
      { char: '🦉', name: 'owl' },
      { char: '🦇', name: 'bat' },
      { char: '🐺', name: 'wolf face' },
      { char: '🐗', name: 'boar' },
      { char: '🐴', name: 'horse face' },
      { char: '🦄', name: 'unicorn face' },
      { char: '🐝', name: 'honeybee' },
      { char: '🐛', name: 'bug' },
      { char: '🦋', name: 'butterfly' },
      { char: '🐌', name: 'snail' },
      { char: '🐞', name: 'lady beetle' },
      { char: '🐜', name: 'ant' },
      { char: '🦟', name: 'mosquito' },
      { char: '🦗', name: 'cricket' },
      { char: '🕷️', name: 'spider' },
      { char: '🕸️', name: 'spider web' },
      { char: '🦂', name: 'scorpion' }
    ],
    food: [
      { char: '🍎', name: 'red apple' },
      { char: '🍏', name: 'green apple' },
      { char: '🍊', name: 'tangerine' },
      { char: '🍋', name: 'lemon' },
      { char: '🍌', name: 'banana' },
      { char: '🍉', name: 'watermelon' },
      { char: '🍇', name: 'grapes' },
      { char: '🍓', name: 'strawberry' },
      { char: '🍈', name: 'melon' },
      { char: '🍒', name: 'cherries' },
      { char: '🍑', name: 'peach' },
      { char: '🥭', name: 'mango' },
      { char: '🍍', name: 'pineapple' },
      { char: '🥥', name: 'coconut' },
      { char: '🥝', name: 'kiwi fruit' },
      { char: '🍅', name: 'tomato' },
      { char: '🍆', name: 'eggplant' },
      { char: '🥑', name: 'avocado' },
      { char: '🥦', name: 'broccoli' },
      { char: '🥬', name: 'leafy greens' },
      { char: '🥒', name: 'cucumber' },
      { char: '🌶️', name: 'hot pepper' },
      { char: '🌽', name: 'ear of corn' },
      { char: '🥕', name: 'carrot' },
      { char: '🥔', name: 'potato' },
      { char: '🍠', name: 'roasted sweet potato' },
      { char: '🥐', name: 'croissant' },
      { char: '🍞', name: 'bread' },
      { char: '🥖', name: 'baguette bread' },
      { char: '🥨', name: 'pretzel' },
      { char: '🧀', name: 'cheese wedge' },
      { char: '🥚', name: 'egg' },
      { char: '🍳', name: 'cooking' },
      { char: '🥞', name: 'pancakes' },
      { char: '🥓', name: 'bacon' },
      { char: '🥩', name: 'cut of meat' },
      { char: '🍗', name: 'poultry leg' },
      { char: '🍖', name: 'meat on bone' },
      { char: '🌭', name: 'hot dog' },
      { char: '🍔', name: 'hamburger' },
      { char: '🍟', name: 'french fries' },
      { char: '🍕', name: 'pizza' }
    ],
    activity: [
      { char: '⚽', name: 'soccer ball' },
      { char: '🏀', name: 'basketball' },
      { char: '🏈', name: 'american football' },
      { char: '⚾', name: 'baseball' },
      { char: '🥎', name: 'softball' },
      { char: '🎾', name: 'tennis' },
      { char: '🏐', name: 'volleyball' },
      { char: '🏉', name: 'rugby football' },
      { char: '🥏', name: 'flying disc' },
      { char: '🎱', name: 'pool 8 ball' },
      { char: '🏓', name: 'ping pong' },
      { char: '🏸', name: 'badminton' },
      { char: '🥅', name: 'goal net' },
      { char: '🏒', name: 'ice hockey' },
      { char: '🏑', name: 'field hockey' },
      { char: '🥍', name: 'lacrosse' },
      { char: '🏏', name: 'cricket game' },
      { char: '⛳', name: 'flag in hole' },
      { char: '🏹', name: 'bow and arrow' },
      { char: '🎣', name: 'fishing pole' },
      { char: '🥊', name: 'boxing glove' },
      { char: '🥋', name: 'martial arts uniform' },
      { char: '🎽', name: 'running shirt' },
      { char: '🛹', name: 'skateboard' },
      { char: '🛷', name: 'sled' },
      { char: '⛸️', name: 'ice skate' },
      { char: '🥌', name: 'curling stone' },
      { char: '🎿', name: 'skis' },
      { char: '⛷️', name: 'skier' },
      { char: '🏂', name: 'snowboarder' },
      { char: '🏋️‍♀️', name: 'woman lifting weights' },
      { char: '🏋️‍♂️', name: 'man lifting weights' },
      { char: '🤼‍♀️', name: 'women wrestling' },
      { char: '🤼‍♂️', name: 'men wrestling' },
      { char: '🤸‍♀️', name: 'woman cartwheeling' },
      { char: '🤸‍♂️', name: 'man cartwheeling' },
      { char: '⛹️‍♀️', name: 'woman bouncing ball' },
      { char: '⛹️‍♂️', name: 'man bouncing ball' },
      { char: '🤺', name: 'person fencing' },
      { char: '🤾‍♀️', name: 'woman playing handball' },
      { char: '🤾‍♂️', name: 'man playing handball' },
      { char: '🏌️‍♀️', name: 'woman golfing' },
      { char: '🏌️‍♂️', name: 'man golfing' },
      { char: '🏇', name: 'horse racing' },
      { char: '🧘‍♀️', name: 'woman in lotus position' },
      { char: '🧘‍♂️', name: 'man in lotus position' }
    ],
    travel: [
      { char: '🚗', name: 'automobile' },
      { char: '🚕', name: 'taxi' },
      { char: '🚙', name: 'sport utility vehicle' },
      { char: '🚌', name: 'bus' },
      { char: '🚎', name: 'trolleybus' },
      { char: '🏎️', name: 'racing car' },
      { char: '🚓', name: 'police car' },
      { char: '🚑', name: 'ambulance' },
      { char: '🚒', name: 'fire engine' },
      { char: '🚐', name: 'minibus' },
      { char: '🚚', name: 'delivery truck' },
      { char: '🚛', name: 'articulated lorry' },
      { char: '🚜', name: 'tractor' },
      { char: '🏍️', name: 'motorcycle' },
      { char: '🛴', name: 'kick scooter' },
      { char: '🚲', name: 'bicycle' },
      { char: '🛵', name: 'motor scooter' },
      { char: '🚁', name: 'helicopter' },
      { char: '✈️', name: 'airplane' },
      { char: '🛩️', name: 'small airplane' },
      { char: '🛫', name: 'airplane departure' },
      { char: '🛬', name: 'airplane arrival' },
      { char: '🚀', name: 'rocket' },
      { char: '🛸', name: 'flying saucer' },
      { char: '🚉', name: 'station' },
      { char: '🚊', name: 'tram' },
      { char: '🚝', name: 'monorail' },
      { char: '🚞', name: 'mountain railway' },
      { char: '🚋', name: 'tram car' },
      { char: '🚃', name: 'railway car' },
      { char: '🚋', name: 'tram car' },
      { char: '🚆', name: 'train' },
      { char: '🚄', name: 'high-speed train' },
      { char: '🚅', name: 'bullet train' },
      { char: '🚈', name: 'light rail' },
      { char: '🚇', name: 'metro' },
      { char: '🚂', name: 'locomotive' },
      { char: '🚖', name: 'oncoming taxi' },
      { char: '🚘', name: 'oncoming automobile' },
      { char: '🚍', name: 'oncoming bus' },
      { char: '🚔', name: 'oncoming police car' },
      { char: '🚯', name: 'no littering' },
      { char: '🚱', name: 'non-potable water' },
      { char: '🚳', name: 'no bicycles' }
    ],
    objects: [
      { char: '💡', name: 'light bulb' },
      { char: '🔦', name: 'flashlight' },
      { char: '🕯️', name: 'candle' },
      { char: '🪔', name: 'diya lamp' },
      { char: '🧯', name: 'fire extinguisher' },
      { char: '🛢️', name: 'oil drum' },
      { char: '💸', name: 'money with wings' },
      { char: '💵', name: 'dollar banknote' },
      { char: '💴', name: 'yen banknote' },
      { char: '💶', name: 'euro banknote' },
      { char: '💷', name: 'pound banknote' },
      { char: '💰', name: 'money bag' },
      { char: '💳', name: 'credit card' },
      { char: '💎', name: 'gem stone' },
      { char: '⚖️', name: 'balance scale' },
      { char: '🔧', name: 'wrench' },
      { char: '🔨', name: 'hammer' },
      { char: '⚒️', name: 'hammer and pick' },
      { char: '🛠️', name: 'hammer and wrench' },
      { char: '⛏️', name: 'pick' },
      { char: '🔩', name: 'nut and bolt' },
      { char: '⚙️', name: 'gear' },
      { char: '🧱', name: 'brick' },
      { char: '⛓️', name: 'chains' },
      { char: '🧲', name: 'magnet' },
      { char: '🔫', name: 'pistol' },
      { char: '💣', name: 'bomb' },
      { char: '🧨', name: 'firecracker' },
      { char: '🔪', name: 'kitchen knife' },
      { char: '🗡️', name: 'dagger' },
      { char: '⚔️', name: 'crossed swords' },
      { char: '🛡️', name: 'shield' },
      { char: '🚬', name: 'cigarette' },
      { char: '⚰️', name: 'coffin' },
      { char: '⚱️', name: 'funeral urn' },
      { char: '🏺', name: 'amphora' },
      { char: '🔮', name: 'crystal ball' },
      { char: '📿', name: 'prayer beads' },
      { char: '🧿', name: 'nazar amulet' },
      { char: '💈', name: 'barber pole' },
      { char: '⚗️', name: 'alembic' },
      { char: '🔭', name: 'telescope' },
      { char: '🔬', name: 'microscope' }
    ],
    symbols: [
      { char: '❤️', name: 'red heart' },
      { char: '🧡', name: 'orange heart' },
      { char: '💛', name: 'yellow heart' },
      { char: '💚', name: 'green heart' },
      { char: '💙', name: 'blue heart' },
      { char: '💜', name: 'purple heart' },
      { char: '🖤', name: 'black heart' },
      { char: '🤍', name: 'white heart' },
      { char: '🤎', name: 'brown heart' },
      { char: '💔', name: 'broken heart' },
      { char: '❣️', name: 'heavy heart exclamation' },
      { char: '💕', name: 'two hearts' },
      { char: '💞', name: 'revolving hearts' },
      { char: '💓', name: 'beating heart' },
      { char: '💗', name: 'growing heart' },
      { char: '💖', name: 'sparkling heart' },
      { char: '💘', name: 'heart with arrow' },
      { char: '💝', name: 'heart with ribbon' },
      { char: '💟', name: 'heart decoration' },
      { char: '☮️', name: 'peace symbol' },
      { char: '✝️', name: 'latin cross' },
      { char: '☪️', name: 'star and crescent' },
      { char: '🕉️', name: 'om' },
      { char: '☸️', name: 'wheel of dharma' },
      { char: '✡️', name: 'star of david' },
      { char: '🔯', name: 'dotted six-pointed star' },
      { char: '🕎', name: 'menorah' },
      { char: '☯️', name: 'yin yang' },
      { char: '☦️', name: 'orthodox cross' },
      { char: '🛐', name: 'place of worship' },
      { char: '⛎', name: 'ophiuchus' },
      { char: '♈', name: 'aries' },
      { char: '♉', name: 'taurus' },
      { char: '♊', name: 'gemini' },
      { char: '♋', name: 'cancer' },
      { char: '♌', name: 'leo' },
      { char: '♍', name: 'virgo' },
      { char: '♎', name: 'libra' },
      { char: '♏', name: 'scorpio' },
      { char: '♐', name: 'sagittarius' },
      { char: '♑', name: 'capricorn' },
      { char: '♒', name: 'aquarius' },
      { char: '♓', name: 'pisces' }
    ],
    flags: [
      { char: '🏁', name: 'chequered flag' },
      { char: '🚩', name: 'triangular flag' },
      { char: '🎌', name: 'crossed flags' },
      { char: '🏴', name: 'black flag' },
      { char: '🏳️', name: 'white flag' },
      { char: '🏳️‍🌈', name: 'rainbow flag' },
      { char: '🏳️‍⚧️', name: 'transgender flag' },
      { char: '🏴‍☠️', name: 'pirate flag' },
      { char: '🇦🇨', name: 'flag: ascension island' },
      { char: '🇦🇩', name: 'flag: andorra' },
      { char: '🇦🇪', name: 'flag: united arab emirates' },
      { char: '🇦🇫', name: 'flag: afghanistan' },
      { char: '🇦🇬', name: 'flag: antigua & barbuda' },
      { char: '🇦🇮', name: 'flag: anguilla' },
      { char: '🇦🇱', name: 'flag: albania' },
      { char: '🇦🇲', name: 'flag: armenia' },
      { char: '🇦🇴', name: 'flag: angola' },
      { char: '🇦🇶', name: 'flag: antarctica' },
      { char: '🇦🇷', name: 'flag: argentina' },
      { char: '🇦🇸', name: 'flag: american samoa' },
      { char: '🇦🇹', name: 'flag: austria' },
      { char: '🇦🇺', name: 'flag: australia' },
      { char: '🇦🇼', name: 'flag: aruba' },
      { char: '🇦🇽', name: 'flag: åland islands' },
      { char: '🇦🇿', name: 'flag: azerbaijan' },
      { char: '🇧🇦', name: 'flag: bosnia & herzegovina' },
      { char: '🇧🇧', name: 'flag: barbados' },
      { char: '🇧🇩', name: 'flag: bangladesh' },
      { char: '🇧🇪', name: 'flag: belgium' },
      { char: '🇧🇫', name: 'flag: burkina faso' },
      { char: '🇧🇬', name: 'flag: bulgaria' },
      { char: '🇧🇭', name: 'flag: bahrain' },
      { char: '🇧🇮', name: 'flag: burundi' },
      { char: '🇧🇯', name: 'flag: benin' },
      { char: '🇧🇱', name: 'flag: st. barthélemy' },
      { char: '🇧🇲', name: 'flag: bermuda' },
      { char: '🇧🇳', name: 'flag: brunei' },
      { char: '🇧🇴', name: 'flag: bolivia' },
      { char: '🇧🇶', name: 'flag: caribbean netherlands' },
      { char: '🇧🇷', name: 'flag: brazil' },
      { char: '🇧🇸', name: 'flag: bahamas' },
      { char: '🇧🇹', name: 'flag: bhutan' },
      { char: '🇧🇻', name: 'flag: bouvet island' },
      { char: '🇧🇼', name: 'flag: botswana' },
      { char: '🇧🇾', name: 'flag: belarus' },
      { char: '🇧🇿', name: 'flag: belize' }
    ]
  };

  // Starfield animation variables
  $scope.stars = [];
  $scope.mouseX = 0;
  $scope.mouseY = 0;

  $scope.init = function() {
    UserService.getMe().then(function(user) {
      $scope.currentUser = user;
      SocketService.connect();
      
      // Monitor socket connection status more reliably
      $scope.checkSocketConnection = setInterval(function() {
        const isConnected = SocketService.isConnected();
        if ($scope.socketConnected !== isConnected) {
          $timeout(function() {
            $scope.socketConnected = isConnected;
          });
        }
      }, 500); // Check every 500ms for more responsive updates
      
      return $scope.loadContacts();
    }).then(function() {
      $scope.loading = false;
      
      // Initialize starfield after a short delay to ensure DOM is ready
      $timeout(function() {
        $scope.initStarfield();
      }, 100);
    }).catch(function(error) {
      console.error('Initialization failed:', error);
      $scope.loading = false;
    });
  };

  $scope.loadContacts = function() {
    return UserService.getContacts().then(function(contacts) {
      $scope.contacts = contacts;
      $scope.filteredContacts = contacts;
      
      // Fetch last message for each contact
      contacts.forEach(function(contact) {
        $scope.fetchLastMessage(contact);
      });
      
      return contacts;
    }).catch(function(error) {
      console.error('Failed to load contacts:', error);
      $scope.contacts = [];
      $scope.filteredContacts = [];
      return [];
    });
  };

  // Fetch last message for a contact
  $scope.fetchLastMessage = function(contact) {
    if (!contact.conversation_id) {
      // Create conversation first to get conversation_id
      ChatService.createConversation(contact.email).then(function(conversation) {
        contact.conversation_id = conversation.id;
        return ChatService.getConversationInfo(conversation.id);
      }).then(function(conversationInfo) {
        if (conversationInfo.last_message) {
          return ChatService.getMessageInfo(conversationInfo.last_message);
        }
        return null;
      }).then(function(messageInfo) {
        if (messageInfo) {
          $timeout(function() {
            // Check if message is deleted
            if (messageInfo.is_deleted || messageInfo.deleted) {
              contact.lastMessageContent = 'This message was deleted';
            } else {
              contact.lastMessageContent = messageInfo.content || (messageInfo.type === 'image' ? '📷 Image' : messageInfo.type === 'file' ? '📎 File' : 'Message');
            }
            contact.lastMessageTime = messageInfo.created_at;
          });
        }
      }).catch(function(error) {
        console.error('Failed to fetch last message for contact:', contact.email, error);
      });
    } else {
      // Already have conversation_id
      ChatService.getConversationInfo(contact.conversation_id).then(function(conversationInfo) {
        if (conversationInfo.last_message) {
          return ChatService.getMessageInfo(conversationInfo.last_message);
        }
        return null;
      }).then(function(messageInfo) {
        if (messageInfo) {
          $timeout(function() {
            // Check if message is deleted
            if (messageInfo.is_deleted || messageInfo.deleted) {
              contact.lastMessageContent = 'This message was deleted';
            } else {
              contact.lastMessageContent = messageInfo.content || (messageInfo.type === 'image' ? '📷 Image' : messageInfo.type === 'file' ? '📎 File' : 'Message');
            }
            contact.lastMessageTime = messageInfo.created_at;
          });
        }
      }).catch(function(error) {
        console.error('Failed to fetch last message for contact:', contact.email, error);
      });
    }
  };

  $scope.filterContacts = function(filterType) {
    $scope.filter = filterType;

    switch(filterType) {
      case 'all':
        // Sort contacts with pinned ones first
        $scope.filteredContacts = $scope.contacts.sort(function(a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return 0;
        });
        break;
      case 'archived':
        $scope.filteredContacts = $scope.contacts.filter(c => c.archived);
        break;
      case 'muted':
        $scope.filteredContacts = $scope.contacts.filter(c => c.muted);
        break;
      case 'favorites':
        $scope.filteredContacts = $scope.contacts.filter(c => c.favorited);
        break;
      default:
        $scope.filteredContacts = $scope.contacts;
    }
  };

  $scope.searchContacts = function() {
    // Cancel previous search timeout
    if ($scope.searchTimeout) {
      $timeout.cancel($scope.searchTimeout);
    }

    if (!$scope.searchQuery || $scope.searchQuery.trim().length === 0) {
      // Reset to show regular contacts when search is empty
      $scope.filterContacts($scope.filter);
      $scope.searchResults = { contacts: [], global: [] };
      $scope.isSearching = false;
      return;
    }

    // Set searching state
    $scope.isSearching = true;

    // Debounce search to avoid too many API calls
    $scope.searchTimeout = $timeout(function() {
      UserService.searchUsers($scope.searchQuery).then(function(results) {
        $scope.searchResults = results;
        
        // Filter out global users who are already in contacts
        if (results.global && results.global.length > 0) {
          const contactEmails = (results.contacts || []).map(c => c.email);
          $scope.searchResults.global = results.global.filter(user => 
            !contactEmails.includes(user.email)
          );
        }
        
        $scope.isSearching = false;
      }).catch(function(error) {
        console.error('Search failed:', error);
        $scope.searchResults = { contacts: [], global: [] };
        $scope.isSearching = false;
      });
    }, 300); // 300ms debounce
  };

  $scope.selectContact = function(contact) {
    $scope.selectedContact = contact;
    $scope.messages = [];
    $scope.loadingMessages = true;

    ChatService.createConversation(contact.email).then(function(conversation) {
      // Store conversation_id in contact for future reference
      contact.conversation_id = conversation.id;
      
      ChatService.setCurrentConversation(conversation);
      
      // Join the conversation room via socket
      SocketService.joinConversation(conversation.id);
      
      // Load messages from database
      return ChatService.loadMessages(conversation.id);
    }).then(function(result) {
      $scope.messages = ChatService.messages;
      $scope.loadingMessages = false;
      
      // Force scroll to bottom after loading initial messages
      $timeout(function() {
        $scope.scrollToBottom(true);
      }, 100);
    }).catch(function(error) {
      console.error('Failed to create conversation or load messages:', error);
      ToastService.error('Failed to start conversation');
      $scope.loadingMessages = false;
    });
  };

  $scope.sendMessage = function(event) {
    // Manually sync textarea value with scope before sending
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea && textarea.value) {
      $scope.messageInput = textarea.value;
    }
    
    // If this was triggered by a keydown event and shift was held, don't send
    if (event && event.shiftKey) {
      return;
    }
    
    if (!$scope.messageInput || !$scope.messageInput.trim()) {
      return;
    }
    
    if (!ChatService.currentConversation) {
      return;
    }
    
    if ($scope.sendingMessage) {
      return;
    }

    const content = $scope.messageInput.trim();
    const replyToId = $scope.replyingTo ? $scope.replyingTo.id : null;
    
    $scope.messageInput = '';
    $scope.replyingTo = null; // Clear reply after sending
    
    // Clear textarea as well
    if (textarea) {
      textarea.value = '';
    }
    
    $scope.sendingMessage = true;

    SocketService.sendTextMessage(ChatService.currentConversation.id, content, replyToId);
    SocketService.stopTyping(ChatService.currentConversation.id);
    
    // Don't refresh messages immediately to prevent profile picture blinking
    $timeout(function() {
      $scope.sendingMessage = false;
    }, 500);
  };

  $scope.onMessageInput = function() {
    if (ChatService.currentConversation) {
      SocketService.startTyping(ChatService.currentConversation.id);
    }
    
    // Auto-resize textarea while maintaining center alignment
    $timeout(function() {
      const textarea = document.querySelector('textarea[ng-model="messageInput"]');
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
        
        // Ensure the parent container maintains center alignment
        const container = textarea.closest('.flex.items-center');
        if (container && newHeight > 44) {
          container.style.alignItems = 'flex-end';
        } else if (container) {
          container.style.alignItems = 'center';
        }
      }
    });
  };

  // Handle keyboard events for message input
  $scope.onMessageKeyDown = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Enter without shift: Send message
      event.preventDefault();
      $scope.sendMessage();
    }
    // For Shift+Enter or other keys, allow default behavior
  };

  // File attachment functions with safer approach
  $scope.toggleAttachmentMenu = function() {
    $scope.showAttachmentMenu = !$scope.showAttachmentMenu;
  };

  $scope.closeAttachmentMenu = function() {
    $scope.showAttachmentMenu = false;
  };

  // Simplified file selection without digest conflicts
  $scope.selectImage = function() {
    $scope.closeAttachmentMenu();
    
    if (!ChatService.currentConversation) {
      ToastService.error('Please select a conversation first');
      return;
    }

    if ($scope.uploadingFile) {
      ToastService.error('Please wait for the current upload to complete');
      return;
    }

    // Create file input directly without promises to avoid digest issues
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg';
    input.style.display = 'none';
    
    input.onchange = function(event) {
      const file = event.target.files[0];
      if (file) {
        // Use $timeout to safely update scope
        $timeout(function() {
          const errors = FileService.validateImage(file, 5);
          
          if (errors.length > 0) {
            ToastService.error(errors[0]);
            return;
          }

          $scope.uploadingFile = true;
          ToastService.success('Uploading image...');

          FileService.fileToBase64(file).then(function(base64Data) {
            $timeout(function() {
              try {
                SocketService.sendImageMessage(
                  ChatService.currentConversation.id,
                  file.name,
                  base64Data
                );
                ToastService.success('Image sent successfully');
                
                // Don't refresh messages to prevent profile picture blinking
                $timeout(function() {
                  $scope.scrollToBottom(true);
                }, 500);
              } catch (error) {
                console.error('Failed to send image:', error);
                ToastService.error('Failed to send image');
              } finally {
                $scope.uploadingFile = false;
              }
            });
          }).catch(function(error) {
            $timeout(function() {
              console.error('Failed to convert image to base64:', error);
              ToastService.error('Failed to process image');
              $scope.uploadingFile = false;
            });
          });
        });
      }
      
      // Cleanup
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    document.body.appendChild(input);
    input.click();
  };

  $scope.selectFile = function() {
    $scope.closeAttachmentMenu();
    
    if (!ChatService.currentConversation) {
      ToastService.error('Please select a conversation first');
      return;
    }

    if ($scope.uploadingFile) {
      ToastService.error('Please wait for the current upload to complete');
      return;
    }

    // Create file input directly without promises to avoid digest issues
    const input = document.createElement('input');
    input.type = 'file';
    // Accept all files EXCEPT images
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.mp3,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.wav,.ogg,.aac,.m4a,.flac';
    input.style.display = 'none';
    
    input.onchange = function(event) {
      const file = event.target.files[0];
      if (file) {
        // Use $timeout to safely update scope
        $timeout(function() {
          const errors = FileService.validateFile(file, 10);
          
          if (errors.length > 0) {
            ToastService.error(errors[0]);
            return;
          }

          $scope.uploadingFile = true;
          ToastService.success('Uploading file...');

          FileService.fileToBase64(file).then(function(base64Data) {
            $timeout(function() {
              try {
                SocketService.sendFileMessage(
                  ChatService.currentConversation.id,
                  file.name,
                  base64Data
                );
                ToastService.success('File sent successfully');
                
                // Don't refresh messages to prevent profile picture blinking
                $timeout(function() {
                  $scope.scrollToBottom(true);
                }, 500);
              } catch (error) {
                console.error('Failed to send file:', error);
                ToastService.error('Failed to send file');
              } finally {
                $scope.uploadingFile = false;
              }
            });
          }).catch(function(error) {
            $timeout(function() {
              console.error('Failed to convert file to base64:', error);
              ToastService.error('Failed to process file');
              $scope.uploadingFile = false;
            });
          });
        });
      }
      
      // Cleanup
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    document.body.appendChild(input);
    input.click();
  };

  // Message options menu
  $scope.messageOptionsMenu = {
    show: false,
    x: 0,
    y: 0,
    message: null
  };

  $scope.showMessageOptions = function(message, $event) {
    $event.stopPropagation();
    $event.preventDefault();
    
    console.log('Showing message options for:', message);
    console.log('Event position:', $event.clientX, $event.clientY);
    
    // Calculate menu position to keep it on screen
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 350; // Approximate menu height
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let x = $event.clientX;
    let y = $event.clientY;
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > windowHeight) {
      y = windowHeight - menuHeight - 10;
    }
    
    // Ensure menu doesn't go off left edge
    if (x < 10) {
      x = 10;
    }
    
    // Ensure menu doesn't go off top edge
    if (y < 10) {
      y = 10;
    }
    
    $scope.messageOptionsMenu.show = true;
    $scope.messageOptionsMenu.x = x;
    $scope.messageOptionsMenu.y = y;
    $scope.messageOptionsMenu.message = message;
    
    console.log('Menu state:', $scope.messageOptionsMenu);
  };

  $scope.hideMessageOptions = function() {
    $scope.messageOptionsMenu.show = false;
  };

  // Simple click outside handler
  angular.element(document).on('click', function(event) {
    const menu = document.querySelector('.message-options-menu');
    const target = event.target;
    
    // If menu exists and click is outside menu
    if (menu && !menu.contains(target) && $scope.messageOptionsMenu.show) {
      $scope.$apply(function() {
        $scope.hideMessageOptions();
      });
    }
  });

  $scope.editMessage = function(message) {
    $scope.hideMessageOptions();
    
    if (!message.content || message.deleted) {
      ToastService.error('Cannot edit this message');
      return;
    }
    
    // Enter edit mode
    message.isEditing = true;
    message.editContent = message.content;
    
    // Focus on the textarea
    $timeout(function() {
      const textarea = document.querySelector('.edit-message-input');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  $scope.onEditKeyDown = function(event, message) {
    if (event.key === 'Escape') {
      // Cancel edit
      message.isEditing = false;
      message.editContent = null;
      event.preventDefault();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      // Save edit
      event.preventDefault();
      
      const newContent = message.editContent.trim();
      if (!newContent) {
        ToastService.error('Message cannot be empty');
        return;
      }
      
      if (newContent === message.content) {
        // No changes
        message.isEditing = false;
        message.editContent = null;
        return;
      }
      
      SocketService.editMessage(message.id || message._id, newContent);
      message.isEditing = false;
      message.editContent = null;
      ToastService.success('Message edited');
      
      // Refetch messages after edit
      $timeout(function() {
        if (ChatService.currentConversation) {
          ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
            $scope.messages = ChatService.messages;
            // Update contact's last message
            $scope.fetchLastMessage($scope.selectedContact);
          });
        }
      }, 500);
    }
  };

  $scope.deleteMessage = function(message) {
    $scope.hideMessageOptions();
    
    if (confirm('Are you sure you want to delete this message?')) {
      SocketService.deleteMessage(message.id || message._id);
      ToastService.success('Message deleted');
      
      // Refetch messages after delete
      $timeout(function() {
        if (ChatService.currentConversation) {
          ChatService.loadMessages(ChatService.currentConversation.id).then(function() {
            $scope.messages = ChatService.messages;
            // Update contact's last message
            $scope.fetchLastMessage($scope.selectedContact);
          });
        }
      }, 500);
    }
  };

  $scope.copyMessageText = function(message) {
    $scope.hideMessageOptions();
    
    if (!message.content) {
      ToastService.error('No text to copy');
      return;
    }
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message.content).then(function() {
        ToastService.success('Text copied to clipboard');
      }).catch(function(error) {
        console.error('Failed to copy text:', error);
        ToastService.error('Failed to copy text');
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Text copied to clipboard');
      } catch (error) {
        console.error('Failed to copy text:', error);
        ToastService.error('Failed to copy text');
      }
      document.body.removeChild(textarea);
    }
  };

  $scope.copyMessageId = function(message) {
    $scope.hideMessageOptions();
    
    const messageId = message.id || message._id;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(messageId).then(function() {
        ToastService.success('Message ID copied to clipboard');
      }).catch(function(error) {
        console.error('Failed to copy message ID:', error);
        ToastService.error('Failed to copy message ID');
      });
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = messageId;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        ToastService.success('Message ID copied to clipboard');
      } catch (error) {
        console.error('Failed to copy message ID:', error);
        ToastService.error('Failed to copy message ID');
      }
      document.body.removeChild(textarea);
    }
  };

  $scope.pinMessage = function(message) {
    $scope.hideMessageOptions();
    ToastService.info('Pin functionality will be implemented soon');
    // TODO: Implement pin functionality
  };

  $scope.forwardMessage = function(message) {
    $scope.hideMessageOptions();
    ToastService.info('Forward functionality will be implemented soon');
    // TODO: Implement forward functionality
  };

  $scope.togglePinMessage = function(message) {
    SocketService.togglePinMessage(message.id);
  };

  $scope.logout = function() {
    SocketService.disconnect();
    AuthService.logout();
  };

  $scope.toggleProfilePopup = function() {
    $scope.showProfilePopup = !$scope.showProfilePopup;
  };

  $scope.closeProfilePopup = function() {
    $scope.showProfilePopup = false;
    $scope.editingProfile = false;
    $scope.resetEditForm();
  };

  $scope.startEditProfile = function() {
    $scope.editingProfile = true;
    $scope.editForm.name = $scope.currentUser.name || '';
    $scope.editForm.username = $scope.currentUser.username || '';
    $scope.editForm.profile_picture = null;
    $scope.editForm.profilePicturePreview = null;
    $scope.usernameAvailable = null;
  };

  $scope.triggerProfilePictureUpload = function() {
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.click();
    }
  };

  $scope.onEditProfilePictureChange = function(event) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        ToastService.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        ToastService.error('Image size should be less than 5MB');
        return;
      }

      $scope.editForm.profile_picture = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = function(e) {
        $scope.$apply(function() {
          $scope.editForm.profilePicturePreview = e.target.result;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  $scope.removeEditProfilePicture = function() {
    $scope.editForm.profile_picture = null;
    $scope.editForm.profilePicturePreview = null;
    
    // Clear file input
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  $scope.cancelEditProfile = function() {
    $scope.editingProfile = false;
    $scope.resetEditForm();
  };

  $scope.resetEditForm = function() {
    $scope.editForm = {
      name: '',
      username: '',
      profile_picture: null,
      profilePicturePreview: null
    };
    $scope.usernameAvailable = null;
    $scope.checkingUsername = false;
    
    // Clear file input
    const fileInput = document.getElementById('editProfilePictureInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  $scope.checkUsernameAvailability = function() {
    if (!$scope.editForm.username || $scope.editForm.username === $scope.currentUser.username) {
      $scope.usernameAvailable = null;
      return;
    }

    $scope.checkingUsername = true;
    
    // Cancel previous timeout if exists
    if ($scope.usernameCheckTimeout) {
      $timeout.cancel($scope.usernameCheckTimeout);
    }
    
    $scope.usernameCheckTimeout = $timeout(function() {
      AuthService.checkUsername($scope.editForm.username).then(function(response) {
        $scope.usernameAvailable = response.available;
        $scope.checkingUsername = false;
      }).catch(function(error) {
        console.error('Username check failed:', error);
        $scope.usernameAvailable = null;
        $scope.checkingUsername = false;
      });
    }, 500);
  };

  $scope.saveProfile = function() {
    if (!$scope.editForm.name.trim() || !$scope.editForm.username.trim()) {
      return;
    }

    if ($scope.usernameAvailable === false) {
      return;
    }

    const formData = new FormData();
    formData.append('name', $scope.editForm.name);
    formData.append('username', $scope.editForm.username);
    
    if ($scope.editForm.profile_picture) {
      formData.append('profile_picture', $scope.editForm.profile_picture);
    }

    AuthService.updateProfile(formData).then(function(response) {
      // Clear cache and refetch user data
      UserService.clearCache();
      return UserService.getMe(true);
    }).then(function(updatedUser) {
      $scope.currentUser = updatedUser;
      $scope.editingProfile = false;
      $scope.resetEditForm();
    }).catch(function(error) {
      console.error('Profile update failed:', error);
    });
  };

  $scope.openAttachmentMenu = function() {
    // Placeholder for future file attachment functionality
    console.log('Attachment menu clicked - feature coming soon!');
  };

  $scope.addToContacts = function(user) {
    if (!user || !user.email) {
      ToastService.error('Invalid user data');
      return;
    }

    // Check if user is already in contacts
    const existingContact = $scope.contacts.find(function(contact) {
      return contact.email === user.email;
    });

    if (existingContact) {
      ToastService.error('User is already in your contacts');
      return;
    }

    // Set loading state for this specific user
    $scope.addingToContacts[user.email] = true;

    UserService.addContact(user.email).then(function(response) {
      // Successfully added to contacts, now refresh the contacts list
      return $scope.loadContacts();
    }).then(function(updatedContacts) {
      // Remove the user from global search results since they're now a contact
      if ($scope.searchResults.global) {
        $scope.searchResults.global = $scope.searchResults.global.filter(function(globalUser) {
          return globalUser.email !== user.email;
        });
      }

      // Add the user to the contacts search results if we're currently searching
      if ($scope.searchQuery && $scope.searchQuery.trim().length > 0) {
        // Find the newly added contact in the updated contacts list
        const newContact = updatedContacts.find(function(contact) {
          return contact.email === user.email;
        });
        
        if (newContact) {
          if (!$scope.searchResults.contacts) {
            $scope.searchResults.contacts = [];
          }
          $scope.searchResults.contacts.push(newContact);
        }
      }

      ToastService.success(`${user.name || user.username} added to contacts`);
    }).catch(function(error) {
      console.error('Failed to add contact:', error);
      // Error message is already shown by the service
    }).finally(function() {
      // Clear loading state
      delete $scope.addingToContacts[user.email];
    });
  };

  $scope.setSidebarView = function(view) {
    $scope.sidebarView = view;
  };

  $scope.showContextMenu = function(event, contact) {
    event.preventDefault();
    event.stopPropagation();
    
    $scope.contextMenu.show = true;
    $scope.contextMenu.contact = contact;
    $scope.contextMenu.x = event.clientX;
    $scope.contextMenu.y = event.clientY;
  };

  $scope.hideContextMenu = function() {
    $scope.contextMenu.show = false;
    $scope.contextMenu.contact = null;
  };

  $scope.archiveChat = function(contact) {
    UserService.archiveContact(contact.email).then(function(response) {
      // Update the contact's archived status based on API response
      if (response && typeof response.archived !== 'undefined') {
        contact.archived = response.archived;
      }
      $scope.loadContacts();
    });
    $scope.hideContextMenu();
  };

  $scope.muteChat = function(contact) {
    UserService.muteContact(contact.email).then(function(response) {
      // Update the contact's muted status based on API response
      if (response && typeof response.muted !== 'undefined') {
        contact.muted = response.muted;
      }
      $scope.loadContacts();
    });
    $scope.hideContextMenu();
  };

  $scope.pinChat = function(contact) {
    UserService.pinContact(contact.email).then(function(response) {
      // Update the contact's pinned status based on API response
      if (response && typeof response.pinned !== 'undefined') {
        contact.pinned = response.pinned;
        contact.is_pinned = response.pinned;
      }
      $scope.loadContacts();
    });
    $scope.hideContextMenu();
  };

  $scope.markAsUnread = function(contact) {
    console.log('Mark as unread:', contact);
    // TODO: Implement mark as unread functionality
    $scope.hideContextMenu();
  };

  $scope.addToFavorites = function(contact) {
    UserService.favoriteContact(contact.email).then(function(response) {
      // Update the contact's favorited status based on API response
      if (response && typeof response.favorited !== 'undefined') {
        contact.favorited = response.favorited;
        contact.is_favorited = response.favorited;
      }
      $scope.loadContacts();
    });
    $scope.hideContextMenu();
  };

  $scope.blockContact = function(contact) {
    UserService.blockContact(contact.email).then(function() {
      $scope.loadContacts();
    });
    $scope.hideContextMenu();
  };

  $scope.deleteChat = function(contact) {
    $scope.deleteContact = contact;
    $scope.showDeleteConfirmation = true;
    $scope.hideContextMenu();
  };

  $scope.confirmDelete = function() {
    if ($scope.deleteContact) {
      console.log('Delete chat confirmed:', $scope.deleteContact);
      // TODO: Implement actual delete functionality
    }
    $scope.cancelDelete();
  };

  $scope.cancelDelete = function() {
    $scope.showDeleteConfirmation = false;
    $scope.deleteContact = null;
  };

  $scope.formatJoinDate = function(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  $scope.formatMessageTime = function(dateString) {
    if (!dateString) return '';
    
    // Parse ISO format date
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    if (diffInHours < 24) {
      // Show time for messages from today
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 24 * 7) {
      // Show day and time for messages from this week
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Show full date for older messages
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  // Starfield Animation Functions
  $scope.createStar = function() {
    const star = document.createElement('div');
    star.className = 'star';
    
    // Random size
    const sizes = ['small', 'medium', 'large'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    star.classList.add(size);
    
    // Random brightness (some stars are brighter)
    if (Math.random() < 0.3) {
      star.classList.add('bright');
    }
    
    // Random horizontal position
    star.style.left = Math.random() * 100 + '%';
    
    // Random animation delay
    star.style.animationDelay = Math.random() * 8 + 's';
    
    return star;
  };

  $scope.initStarfield = function() {
    const chatAreaParallaxContainer = document.getElementById('chatAreaParallaxContainer');
    
    if (!chatAreaParallaxContainer) return;
    
    // Create initial stars for chat area only
    for (let i = 0; i < 30; i++) {
      const star = $scope.createStar();
      chatAreaParallaxContainer.appendChild(star);
    }
    
    // Add mouse move listener for parallax effect (only for chat area)
    const chatArea = document.querySelector('.flex-1.flex.flex-col.bg-black.relative');
    if (chatArea) {
      chatArea.addEventListener('mousemove', function(e) {
        const rect = chatArea.getBoundingClientRect();
        $scope.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        $scope.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        
        // Apply parallax transform
        const translateX = $scope.mouseX * 15;
        const translateY = $scope.mouseY * 8;
        
        chatAreaParallaxContainer.style.transform = `translate(${translateX}px, ${translateY}px)`;
      });
    }
    
    // Continuously add new stars (reduced frequency)
    setInterval(function() {
      if (chatAreaParallaxContainer.children.length < 40) {
        const star = $scope.createStar();
        chatAreaParallaxContainer.appendChild(star);
        
        // Remove old stars to prevent memory leaks
        setTimeout(function() {
          if (star.parentNode) {
            star.parentNode.removeChild(star);
          }
        }, 25000);
      }
    }, 3000);
  };

  $scope.toggleTheme = function() {
    ThemeService.toggleTheme();
  };

  $scope.isMessageFromMe = function(message) {
    return $scope.currentUser && message.sender_id === $scope.currentUser.id;
  };

  $scope.getProfilePicture = function(filename) {
    return UserService.getProfilePicture(filename);
  };

  // Message rendering functions
  $scope.isTextMessage = function(message) {
    return !message.type || message.type === 'text';
  };

  $scope.isImageMessage = function(message) {
    return message.type === 'image';
  };

  $scope.isFileMessage = function(message) {
    return message.type === 'file';
  };

  // Discord-style message helper functions
  $scope.getMessageSenderAvatar = function(message) {
    if (message.sender_avatar) {
      return UserService.getProfilePicture(message.sender_avatar);
    }
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(message.sender_name || 'User') + '&background=9333ea&color=fff&size=128';
  };

  $scope.getMessageSenderName = function(message) {
    return message.sender_name || message.sender || 'Unknown';
  };

  // Check if message is from current user
  $scope.isMessageFromMe = function(message) {
    return $scope.currentUser && (message.sender === $scope.currentUser.email);
  };

  // Infinite scroll - load older messages
  $scope.loadOlderMessages = function() {
    if (!ChatService.currentConversation || $scope.loadingOlderMessages || !ChatService.hasMoreMessages) {
      return;
    }

    if ($scope.messages.length === 0) {
      return;
    }

    $scope.loadingOlderMessages = true;
    const oldestMessage = $scope.messages[0];
    const beforeId = oldestMessage.id || oldestMessage._id;

    ChatService.loadMessages(ChatService.currentConversation.id, beforeId).then(function(result) {
      $scope.messages = ChatService.messages;
      $scope.loadingOlderMessages = false;
      
      // Update hasMoreMessages flag
      ChatService.hasMoreMessages = result.hasMore;
    }).catch(function(error) {
      console.error('Failed to load older messages:', error);
      ToastService.error('Failed to load older messages');
      $scope.loadingOlderMessages = false;
    });
  };

  // Jump to Present button state
  $scope.showJumpToPresent = false;

  // Scroll handling
  $scope.onScroll = function(event) {
    const element = event.target;
    
    // Calculate distance from bottom
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    // Show "Jump to Present" button if user scrolled up more than ~10 messages worth (approximately 500px)
    $scope.$apply(function() {
      $scope.showJumpToPresent = distanceFromBottom > 500;
    });
    
    // Check if scrolled to top (load more messages)
    if (element.scrollTop === 0 && !$scope.loadingOlderMessages && ChatService.hasMoreMessages) {
      const scrollHeight = element.scrollHeight;
      
      $scope.loadOlderMessages();
      
      // Maintain scroll position after loading older messages
      $timeout(function() {
        const newScrollHeight = element.scrollHeight;
        const scrollDiff = newScrollHeight - scrollHeight;
        element.scrollTop = scrollDiff;
      }, 100);
    }
  };

  $scope.jumpToPresent = function() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      $scope.showJumpToPresent = false;
    }
  };

  $scope.scrollToBottom = function(force) {
    $timeout(function() {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        // Only auto-scroll if forced or user is near bottom (within 100px)
        const isNearBottom = force || (messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight) < 100;
        
        if (isNearBottom) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          $scope.showJumpToPresent = false;
        }
      }
    }, 50);
  };

  // Media handling functions
  $scope.isMediaMessage = function(message) {
    return message.media_url && !message.content;
  };

  $scope.isAudioFile = function(filename) {
    if (!filename) return false;
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
    const ext = filename.split('.').pop().toLowerCase();
    return audioExtensions.includes(ext);
  };

  $scope.isImageFile = function(filename) {
    if (!filename) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const ext = filename.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
  };

  $scope.downloadMediaFile = function(message) {
    // For images, download from blob URL
    if (message.isImage && message.imageUrl && message.file_name) {
      try {
        const a = document.createElement('a');
        a.href = message.imageUrl;
        a.download = message.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error('Failed to download image:', error);
        ToastService.error('Failed to download image');
      }
    } else if (message.download_url && message.file_name) {
      // For files, use the download URL
      ChatService.downloadFile(message.download_url, message.file_name).catch(function(error) {
        ToastService.error('Failed to download file');
      });
    }
  };

  $scope.getMediaUrl = function(message) {
    // For images, use the blob URL created during processing
    if (message.isImage && message.imageUrl) {
      return message.imageUrl;
    }
    // For files, construct the download URL
    if (message.download_url) {
      return window.APP_CONFIG.API_BASE_URL + message.download_url;
    }
    return null;
  };

  // Reply functionality
  $scope.replyingTo = null;

  $scope.replyToMessage = function(message) {
    $scope.replyingTo = {
      id: message.id || message._id,
      sender_name: message.sender_name || message.sender_info?.name || message.sender_info?.username,
      content: message.content || (message.type === 'image' ? '📷 Image' : message.type === 'file' ? '📎 File' : 'Message')
    };
    
    // Focus on the message input
    $timeout(function() {
      const textarea = document.querySelector('textarea[ng-model="messageInput"]');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  $scope.cancelReply = function() {
    $scope.replyingTo = null;
  };

  $scope.forwardMessage = function(message) {
    console.log('Forward message:', message);
    // TODO: Implement forward functionality
  };

  $scope.getFileIcon = function(fileName) {
    if (!fileName) return 'file';
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'spreadsheet';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext)) return 'audio';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
    
    return 'file';
  };

  $scope.formatFileSize = function(bytes) {
    if (!bytes) return '';
    return FileService.formatFileSize(bytes);
  };

  $scope.downloadFile = function(message) {
    if (message.file_data && message.file_name) {
      try {
        // Convert base64 to blob and download
        const byteCharacters = atob(message.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = message.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download file:', error);
        ToastService.error('Failed to download file');
      }
    }
  };

  $scope.$on('user:typing', function(event, data) {
    $scope.typingUsers[data.user_id] = true;
    $timeout(function() {
      delete $scope.typingUsers[data.user_id];
    }, 3000);
  });

  $scope.$on('user:stop_typing', function(event, data) {
    delete $scope.typingUsers[data.user_id];
  });

  $scope.$on('user:presence', function(event, data) {
    const contact = $scope.contacts.find(c => c.id === data.user_id);
    if (contact) {
      contact.online = data.online;
    }
  });

  // Socket event handlers for real-time message updates
  $scope.$on('message:new', function(event, message) {
    if (ChatService.currentConversation && message.conversation_id === ChatService.currentConversation.id) {
      ChatService.addMessage(message);
      $timeout(function() {
        $scope.messages = ChatService.messages;
        // Auto-scroll for new messages (will only scroll if user is near bottom)
        $scope.scrollToBottom(false);
      }, 100);
    }
    
    // Update last message for the contact in the sidebar
    const contact = $scope.contacts.find(c => c.conversation_id === message.conversation_id);
    if (contact) {
      $timeout(function() {
        contact.lastMessageContent = message.content || (message.type === 'image' ? '📷 Image' : message.type === 'file' ? '📎 File' : 'Message');
        contact.lastMessageTime = message.created_at;
      });
    }
  });

  $scope.$on('message:updated', function(event, data) {
    if (ChatService.currentConversation && data.conversation_id === ChatService.currentConversation.id) {
      ChatService.updateMessage(data.message_id, data.updates);
      $timeout(function() {
        $scope.messages = ChatService.messages;
      });
    }
  });

  $scope.$on('message:deleted', function(event, data) {
    if (ChatService.currentConversation && data.conversation_id === ChatService.currentConversation.id) {
      ChatService.removeMessage(data.message_id);
      $timeout(function() {
        $scope.messages = ChatService.messages;
      });
    }
  });

  // Track if we should auto-scroll (only when user is near bottom)
  $scope.shouldAutoScroll = true;
  
  $scope.$watch(function() {
    return ChatService.messages;
  }, function(newMessages, oldMessages) {
    if (newMessages === oldMessages) return;
    
    $scope.messages = newMessages;
    
    // Only auto-scroll if user is near the bottom
    $scope.scrollToBottom(false);
  }, true);

  $scope.init();

  // Clean up timeouts on scope destroy
  $scope.$on('$destroy', function() {
    if ($scope.usernameCheckTimeout) {
      $timeout.cancel($scope.usernameCheckTimeout);
    }
    if ($scope.searchTimeout) {
      $timeout.cancel($scope.searchTimeout);
    }
    if ($scope.checkSocketConnection) {
      clearInterval($scope.checkSocketConnection);
    }
  });

  // Emoji picker functions
  $scope.toggleEmojiPicker = function() {
    $scope.showEmojiPicker = !$scope.showEmojiPicker;
    if ($scope.showEmojiPicker && $scope.emojiTab === 'gif' && $scope.trendingGifs.length === 0) {
      $scope.loadTrendingGifs();
    }
  };

  $scope.setEmojiTab = function(tab) {
    $scope.emojiTab = tab;
    if (tab === 'gif' && $scope.trendingGifs.length === 0) {
      $scope.loadTrendingGifs();
    }
  };

  $scope.setEmojiCategory = function(category) {
    $scope.emojiCategory = category;
  };

  $scope.getFilteredEmojis = function() {
    const categoryEmojis = $scope.emojis[$scope.emojiCategory] || [];
    if (!$scope.emojiSearch) {
      return categoryEmojis;
    }
    
    const searchTerm = $scope.emojiSearch.toLowerCase();
    return categoryEmojis.filter(emoji => 
      emoji.name.toLowerCase().includes(searchTerm)
    );
  };

  $scope.insertEmoji = function(emoji) {
    const textarea = document.querySelector('textarea[ng-model="messageInput"]');
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = $scope.messageInput.substring(0, cursorPos);
      const textAfter = $scope.messageInput.substring(cursorPos);
      
      $scope.messageInput = textBefore + emoji.char + textAfter;
      
      // Set cursor position after emoji
      $timeout(function() {
        textarea.focus();
        textarea.setSelectionRange(cursorPos + emoji.char.length, cursorPos + emoji.char.length);
      });
    }
    
    $scope.showEmojiPicker = false;
  };

  $scope.loadTrendingGifs = function() {
    // Mock trending GIFs - in a real app, you'd use Giphy API
    $scope.trendingGifs = [
      {
        id: '1',
        title: 'Happy Dance',
        images: {
          fixed_height_small: {
            url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif'
          }
        }
      },
      {
        id: '2',
        title: 'Thumbs Up',
        images: {
          fixed_height_small: {
            url: 'https://media.giphy.com/media/111ebonMs90YLu/200.gif'
          }
        }
      },
      {
        id: '3',
        title: 'Clapping',
        images: {
          fixed_height_small: {
            url: 'https://media.giphy.com/media/7rj2ZgttvgomY/200.gif'
          }
        }
      },
      {
        id: '4',
        title: 'Heart Eyes',
        images: {
          fixed_height_small: {
            url: 'https://media.giphy.com/media/3o7abAHdYvZdBNnGZq/200.gif'
          }
        }
      }
    ];
  };

  $scope.searchGifs = function() {
    if (!$scope.gifSearch) {
      $scope.searchResults = [];
      return;
    }

    $scope.searchingGifs = true;
    
    // Mock GIF search - in a real app, you'd use Giphy API
    $timeout(function() {
      $scope.searchResults = [
        {
          id: 'search1',
          title: $scope.gifSearch + ' GIF 1',
          images: {
            fixed_height_small: {
              url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif'
            }
          }
        },
        {
          id: 'search2',
          title: $scope.gifSearch + ' GIF 2',
          images: {
            fixed_height_small: {
              url: 'https://media.giphy.com/media/111ebonMs90YLu/200.gif'
            }
          }
        }
      ];
      $scope.searchingGifs = false;
    }, 1000);
  };

  $scope.insertGif = function(gif) {
    // In a real app, you'd send the GIF URL as a message
    const gifMessage = `[GIF: ${gif.title}](${gif.images.fixed_height_small.url})`;
    $scope.messageInput = ($scope.messageInput || '') + gifMessage;
    $scope.showEmojiPicker = false;
  };

  // Hide context menu when clicking elsewhere
  angular.element(document).on('click', function(event) {
    $scope.$apply(function() {
      $scope.hideContextMenu();
      
      // Close attachment menu if clicking outside
      if ($scope.showAttachmentMenu) {
        const attachmentMenu = event.target.closest('.attachment-menu');
        const plusButton = event.target.closest('button[ng-click="toggleAttachmentMenu()"]');
        
        if (!attachmentMenu && !plusButton) {
          $scope.closeAttachmentMenu();
        }
      }

      // Close emoji picker if clicking outside
      if ($scope.showEmojiPicker) {
        const emojiPicker = event.target.closest('.emoji-picker-container');
        const emojiButton = event.target.closest('button[ng-click="toggleEmojiPicker()"]');
        
        if (!emojiPicker && !emojiButton) {
          $scope.showEmojiPicker = false;
        }
      }
    });
  });
}]);
