// Fills the advert slots (.sideBar img) with the other HackNotts teams' projects, in a random order
// each visit: a picture with a title made on cooltext.com on its corner (both in images/ads/)
// and a cheesy 2000s slogan underneath. To add a team, add it to ADS.
(function () {
    const ADS = [
        { name: 'Eye tracking Instagram reel scrolling', image: 'eye-tracking.jpg', title: 'title-eye.png', slogan: 'Scroll reels with just your EYES! Look Mum, no hands!' },
        { name: 'Finger tracking skateboard game', image: 'finger-skate.jpg', title: 'title-skate.png', slogan: 'Kickflips with your FINGERS! Totally radical!' },
        { name: 'Remaking PictoChat on the Nintendo DS', image: 'pictochat.jpg', title: 'title-picto.png', slogan: 'PictoChat is BACK! Doodle with your mates!' },
        { name: 'A social foundation for young adults in an increasingly divisive world', image: 'social-foundation.jpg', title: 'title-social.png', slogan: 'Raise a pixel pal. Make REAL friends!' },
        { name: 'Cardboard arcade', image: 'cardboard-arcade.jpg', title: 'title-arcade.png', slogan: '100% cardboard. 100% ARCADE. Insert coin!' },
        { name: 'Scam awareness app', image: 'scam-awareness.jpg', title: 'title-scam.png', slogan: 'You are NOT the 1,000,000th visitor. Stay scam safe!' },
        { name: 'Squid Game text based game', image: 'squid-game.jpg', title: 'title-squid.png', slogan: '456 players. 1 winner. Start game? (Y/N)' },
        { name: 'Dial-up is the future', image: 'dial-up.jpg', title: 'title-dialup.png', slogan: '56k of pure SPEED! Get connected TODAY!' },
    ];

    const folder = '../../images/ads/';
    const ads = ADS.slice().sort(() => Math.random() - 0.5);
    document.querySelectorAll('.sideBar img').forEach((slot, i) => {
        const ad = ads[i % ads.length];
        const box = document.createElement('div');
        box.className = 'advert';
        box.title = ad.name;
        const title = document.createElement('img');
        title.className = 'adTitle';
        title.src = folder + ad.title;
        title.alt = ad.name;
        const slogan = document.createElement('p');
        slogan.className = 'adSlogan';
        slogan.textContent = ad.slogan;
        slot.replaceWith(box);
        slot.src = folder + ad.image;
        slot.alt = '';
        box.append(title, slot, slogan);
    });
})();
