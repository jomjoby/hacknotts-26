// Fills the advert slots (.sideBar img) with the other HackNotts teams' projects, in a random order
// each visit. To add a team, add its pictures (in images/ads/) to ADS.
(function () {
    const ADS = [
        ['team1-a.jpg', 'team1-b.jpg'],
        ['team2-a.jpg'],
        ['team3-a.jpg'],
        ['team4-a.jpg'],
    ];

    const teams = ADS.map(images => ({ images, next: 0 })).sort(() => Math.random() - 0.5);
    document.querySelectorAll('.sideBar img').forEach((slot, i) => {
        const team = teams[i % teams.length];
        slot.src = '../../images/ads/' + team.images[team.next++ % team.images.length];
        slot.alt = 'Advert';
        slot.classList.add('advert');
    });
})();
