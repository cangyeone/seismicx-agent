import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface WaveformProps {
  data: number[];
  samplingRate: number;
  title: string;
}

const WaveformDisplay: React.FC<WaveformProps> = ({ data, samplingRate, title }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const x = d3.scaleLinear()
      .domain([0, data.length / samplingRate])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([d3.min(data) || -1, d3.max(data) || 1])
      .range([height - margin.bottom, margin.top]);

    const line = d3.line<number>()
      .x((_, i) => x(i / samplingRate))
      .y(d => y(d));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => `${d}s`))
      .attr("color", "#6b7280");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#6b7280");

    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top)
      .attr("text-anchor", "middle")
      .attr("class", "text-xs font-mono fill-gray-400")
      .text(title);

  }, [data, samplingRate, title]);

  return (
    <div className="w-full h-48 bg-black/20 rounded-lg border border-white/5 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default WaveformDisplay;
