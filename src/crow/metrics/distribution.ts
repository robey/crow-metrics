import { BiasedQuantileDistribution } from "../bqdist";
import { Gauge } from "./gauge";
import { Metric } from "./metric";
import { MetricName, MetricType } from "../metric_name";

/*
 * A distribution collects samples over a time period, and then summarizes
 * them based on percentiles requested (median, 90th percentile, and so on).
 */
export class Distribution extends Metric {
  private distribution: BiasedQuantileDistribution;
  private percentileGauges: MetricName<Gauge>[];
  private countGauge: MetricName<Gauge>;
  private sumGauge: MetricName<Gauge>;

  constructor(name: MetricName<Distribution>, public percentiles: number[], public error: number) {
    super(name, MetricType.Distribution);
    this.distribution = new BiasedQuantileDistribution(percentiles, error);

    const baseGauge = MetricName.create<Gauge>(MetricType.Gauge, name.name, name.tags);
    this.percentileGauges = percentiles.map(p => baseGauge.addTag("p", p.toString()));
    this.countGauge = baseGauge.addTag("p", "count");
    this.sumGauge = baseGauge.addTag("p", "sum");
  }

  /*
   * add one data point (or more, if an array) to the distribution.
   */
  add(data: number | number[]): void {
    if (Array.isArray(data)) {
      data.forEach(x => this.distribution.record(x));
    } else {
      this.distribution.record(data);
    }
  }

  save(snapshot: Map<MetricName<Metric>, number>): void {
    const data = this.distribution.snapshot();
    this.distribution.reset();
    if (data.sampleCount == 0) return;
    for (let i = 0; i < this.percentiles.length; i++) {
      snapshot.set(this.percentileGauges[i], data.getPercentile(this.percentiles[i]));
    }
    snapshot.set(this.countGauge, data.sampleCount);
    snapshot.set(this.sumGauge, data.sampleSum);
  }

//   /*
//    * time a function call and record it (in milliseconds).
//    * if the function returns a promise, the recorded time will cover the time
//    * until the promise succeeds.
//    * exceptions (and rejected promises) are not recorded.
//    */
//   time(f) {
//     const startTime = Date.now();
//     const rv = f();
//     // you aren't going to believe this. the type of null is... "object". :(
//     if (rv != null && typeof rv === "object" && typeof rv.then === "function") {
//       return rv.then(rv2 => {
//         this.add(Date.now() - startTime);
//         return rv2;
//       });
//     } else {
//       this.add(Date.now() - startTime);
//       return rv;
//     }
//   }
}
