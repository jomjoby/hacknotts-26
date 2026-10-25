// Fills the advert slots (.sideBar img) with the other HackNotts teams' projects, in a random order
// each visit: a title made on cooltext.com over a picture (both in images/ads/).
// To add a team, add it to ADS (title can be left out).
(function () {
    const ADS = [
        { name: 'Eye tracking Instagram reel scrolling', image: 'eye-tracking.jpg', title: 'title-eye.png' },
        { name: 'Finger tracking skateboard game', image: 'finger-skate.jpg', title: 'title-skate.png' },
        { name: 'Remaking PictoChat on the Nintendo DS', image: 'pictochat.jpg', title: 'title-picto.png' },
        { name: 'A social foundation for young adults in an increasingly divisive world', image: 'social-foundation.jpg', title: 'title-social.png' },
        { name: 'Cardboard arcade', image: 'cardboard-arcade.jpg', title: 'title-arcade.png' },
        { name: 'Scam awareness app', image: 'scam-awareness.jpg', title: 'title-scam.png' },
        { name: 'Squid Game text based game', image: 'squid-game.jpg', title: 'title-squid.png' },
        { name: 'Another HackNotts project', image: 'team4.jpg' },
    ];

    const folder = '../../images/ads/';
    const ads = ADS.slice().sort(() => Math.random() - 0.5);
    document.querySelectorAll('.sideBar img').forEach((slot, i) => {
        const ad = ads[i % ads.length];
        const box = document.createElement('div');
        box.className = 'advert';
        box.title = ad.name;
        if (ad.title) {
            const title = document.createElement('img');
            title.className = 'adTitle';
            title.src = folder + ad.title;
            title.alt = ad.name;
            box.appendChild(title);
        }
        slot.replaceWith(box);
        slot.src = folder + ad.image;
        slot.alt = ad.title ? '' : ad.name;
        box.appendChild(slot);
    });
})();
