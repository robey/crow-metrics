import { Metric } from "./metric";
import { MetricName, MetricType } from "../metric_name";

export class Gauge extends Metric {
  constructor(name: MetricName<Gauge>, private getter?: number | (() => number)) {
    super(name, MetricType.Gauge);
  }

  set(getter?: number | (() => number)) {
    this.getter = getter;
  }

  get value(): number {
    return (this.getter instanceof Function) ? this.getter() : this.getter;
  }

  save(snapshot: Map<MetricName<Metric>, number>): void {
    if (this.getter == null) return;
    snapshot.set(this.name, this.value);
  }
}
