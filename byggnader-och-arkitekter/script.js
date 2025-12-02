// Load and process the data
d3.json('Arkitekter, byggnader och hur de hör ihop.json').then(data => {
    const bindings = data.results.bindings;

    // Create nodes and links
    const nodesMap = new Map();
    const links = [];

    bindings.forEach(binding => {
        const architectId = binding.node.value;
        const architectName = binding.nodeLabel.value;
        const buildingId = binding.linkedNode.value;
        const buildingName = binding.linkedNodeLabel.value;

        // Add architect node
        if (!nodesMap.has(architectId)) {
            nodesMap.set(architectId, {
                id: architectId,
                name: architectName,
                type: 'architect',
                connections: []
            });
        }

        // Add building node
        if (!nodesMap.has(buildingId)) {
            nodesMap.set(buildingId, {
                id: buildingId,
                name: buildingName,
                type: 'building',
                connections: []
            });
        }

        // Add link
        links.push({
            source: architectId,
            target: buildingId
        });

        // Track connections for info display
        nodesMap.get(architectId).connections.push(buildingName);
        nodesMap.get(buildingId).connections.push(architectName);
    });

    const nodes = Array.from(nodesMap.values());

    // Set up SVG
    const svg = d3.select('#graph');
    const width = window.innerWidth - 280;
    const height = window.innerHeight;

    svg.attr('width', width).attr('height', height);

    // Create container for zoom
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(100))
        .force('charge', d3.forceManyBody()
            .strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(25));

    // Create links
    const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('class', 'link');

    // Create nodes
    const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', d => `node ${d.type}`)
        .call(drag(simulation));

    // Add circles to nodes
    node.append('circle')
        .attr('r', d => d.type === 'architect' ? 8 : 7);

    // Add labels to nodes (initially hidden, shown on hover)
    node.append('text')
        .attr('dx', 10)
        .attr('dy', 4)
        .text(d => d.name)
        .style('opacity', 0);

    // Add hover interactions
    node.on('mouseenter', function(event, d) {
        const connectedNodeIds = new Set();
        const connectedLinkIds = new Set();

        // Find connected nodes and links
        links.forEach((link, i) => {
            if (link.source.id === d.id || link.target.id === d.id) {
                connectedLinkIds.add(i);
                connectedNodeIds.add(link.source.id);
                connectedNodeIds.add(link.target.id);
            }
        });

        // Highlight connected elements
        node.classed('highlighted', n => connectedNodeIds.has(n.id))
            .classed('dimmed', n => !connectedNodeIds.has(n.id));

        link.classed('highlighted', (l, i) => connectedLinkIds.has(i))
            .classed('dimmed', (l, i) => !connectedLinkIds.has(i));

        // Show label for hovered node
        d3.select(this).select('text')
            .style('opacity', 1);

        // Update info panel
        const connectionCount = d.connections.length;
        const connectionText = d.type === 'architect'
            ? `${connectionCount} byggnad${connectionCount !== 1 ? 'er' : ''}`
            : `${connectionCount} arkitekt${connectionCount !== 1 ? 'er' : ''}`;

        d3.select('#node-info').html(`
            <div class="node-name">${d.name}</div>
            <div class="node-type">${d.type === 'architect' ? 'Arkitekt' : 'Byggnad'}</div>
            <div class="node-connections">${connectionText}</div>
        `);
    })
    .on('mouseleave', function() {
        // Remove all highlights
        node.classed('highlighted', false)
            .classed('dimmed', false);
        link.classed('highlighted', false)
            .classed('dimmed', false);

        // Hide all labels
        node.select('text').style('opacity', 0);

        // Reset info panel
        d3.select('#node-info').html(`
            <p class="hint">Hovra över noder för information</p>
        `);
    });

    // Update positions on each tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth - 280;
        const newHeight = window.innerHeight;
        svg.attr('width', newWidth).attr('height', newHeight);
        simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
    });

}).catch(error => {
    console.error('Error loading data:', error);
    d3.select('#node-info').html(`
        <p style="color: #cc0000;">Fel vid laddning av data</p>
    `);
});
