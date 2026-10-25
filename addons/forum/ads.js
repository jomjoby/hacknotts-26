// Fills the side bars with adverts for the other HackNotts teams' projects: a picture with a title
// made on cooltext.com on its corner (both in images/ads/) and a cheesy 2000s slogan underneath.
// The order is shuffled each visit, and each side gets as many adverts as fit beside the page,
// worked out again whenever the window or the page changes size. To add a team, add it to ADS
// (width and height are the picture's size, so space is saved for it before it loads).
(function () {
    const ADS = [
        { name: 'Eye tracking Instagram reel scrolling', image: 'eye-tracking.jpg', width: 300, height: 300, title: 'title-eye.png', slogan: 'Scroll reels with just your EYES! Look Mum, no hands!' },
        { name: 'Finger tracking skateboard game', image: 'finger-skate.jpg', width: 300, height: 300, title: 'title-skate.png', slogan: 'Kickflips with your FINGERS! Totally radical!' },
        { name: 'Remaking PictoChat on the Nintendo DS', image: 'pictochat.jpg', width: 300, height: 169, title: 'title-picto.png', slogan: 'PictoChat is BACK! Doodle with your mates!' },
        { name: 'A social foundation for young adults in an increasingly divisive world', image: 'social-foundation.jpg', width: 300, height: 423, title: 'title-social.png', slogan: 'Raise a pixel pal. Make REAL friends!' },
        { name: 'Cardboard arcade', image: 'cardboard-arcade.jpg', width: 300, height: 325, title: 'title-arcade.png', slogan: '100% cardboard. 100% ARCADE. Insert coin!' },
        { name: 'Scam awareness app', image: 'scam-awareness.jpg', width: 300, height: 225, title: 'title-scam.png', slogan: 'You are NOT the 1,000,000th visitor. Stay scam safe!' },
        { name: 'Squid Game text based game', image: 'squid-game.jpg', width: 300, height: 137, title: 'title-squid.png', slogan: '456 players. 1 winner. Start game? (Y/N)' },
        { name: 'Dial-up is the future', image: 'dial-up.jpg', width: 300, height: 321, title: 'title-dialup.png', slogan: '56k of pure SPEED! Get connected TODAY!' },
    ];

    const folder = '../../images/ads/';
    const main = document.getElementById('mainBar');
    const sides = [...document.querySelectorAll('.sideBar')];
    const order = ADS.slice().sort(() => Math.random() - 0.5);

    function makeAdvert(ad) {
        const box = document.createElement('div');
        box.className = 'advert';
        box.title = ad.name;
        const title = document.createElement('img');
        title.className = 'adTitle';
        title.src = folder + ad.title;
        title.alt = ad.name;
        const picture = document.createElement('img');
        picture.src = folder + ad.image;
        picture.width = ad.width;
        picture.height = ad.height;
        picture.alt = '';
        const slogan = document.createElement('p');
        slogan.className = 'adSlogan';
        slogan.textContent = ad.slogan;
        box.append(title, picture, slogan);
        return box;
    }

    // Deal the adverts out left, right, left, right... and keep adding to each side until the next
    // one would hang past the bottom of the page. Every side gets at least one.
    function fill() {
        const bottom = main.getBoundingClientRect().bottom;
        sides.forEach(side => side.replaceChildren());
        sides.forEach((side, s) => {
            for (let i = s; i < 50; i += sides.length) {
                const advert = makeAdvert(order[i % order.length]);
                side.appendChild(advert);
                if (advert.getBoundingClientRect().bottom > bottom && side.children.length > 1) {
                    advert.remove();
                    break;
                }
            }
        });
    }

    let queued = false;
    function refill() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; fill(); });
    }

    fill();
    // The forum pages load posts after the page opens, so watch the page's height as well as the window.
    let lastHeight = main.offsetHeight, lastWidth = innerWidth;
    new ResizeObserver(() => {
        if (main.offsetHeight === lastHeight && innerWidth === lastWidth) return;
        lastHeight = main.offsetHeight;
        lastWidth = innerWidth;
        refill();
    }).observe(main);
    addEventListener('resize', () => {
        if (innerWidth === lastWidth) return;
        lastWidth = innerWidth;
        refill();
    });
})();
