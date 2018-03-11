import { Counter, Distribution, Gauge, MetricType, NoTags, Tags } from "./metric_name";
import { MetricsRegistry } from "./registry";
import { performance } from "perf_hooks";

/*
 * a prefix and base tags, for generating metric names.
 */
export class Metrics {
  constructor(
    public registry: MetricsRegistry,
    public prefix: string = "",
    public tags: Tags = NoTags
  ) {
    // pass
  }

  /*
   * Create a counter with the given name and optional tags.
   */
  counter(name: string, tags: Tags = NoTags): Counter {
    const rv = new Counter(this.prefix + name, this.tags, tags);
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Create a gauge with the given name and optional tags.
   */
  gauge(name: string, tags: Tags = NoTags): Gauge {
    const rv = new Gauge(this.prefix + name, this.tags, tags);
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Create a distribution with the given name and optional tags.
   */
  distribution(
    name: string,
    tags: Tags = NoTags,
    percentiles: number[] = this.registry.percentiles,
    error: number = this.registry.error
  ): Distribution {
    const rv = new Distribution(this.prefix + name, this.tags, tags, percentiles, error);
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Increment a counter.
   */
  increment(name: Counter, count: number = 1) {
    const metric = this.registry.getOrMake(name);
    metric.increment(count);
    metric.touch(this.registry.currentTime);
  }

  /*
   * Get the current value of a counter.
   */
  getCounter(name: Counter): number {
    return this.registry.getOrMake(name).getValue();
  }

  /*
   * Add (or replace) a gauge with the given name.
   * The getter is normally a function that computes the value on demand,
   * but if the value changes rarely or never, you may use a constant value
   * instead.
   */
  setGauge(name: Gauge, getter: number | (() => number)) {
    this.registry.getOrMake(name).setGauge(getter);
  }

  /*
   * Remove a gauge.
   */
  removeGauge(name: Gauge) {
    const metric = this.registry.get(name);
    if (metric === undefined) throw new Error("No such gauge: " + name.canonical);
    metric.assertType(MetricType.Gauge);
    this.registry.remove(name);
  }

  /*
   * Add a data point (or array of data points) to a distribution.
   */
  addDistribution(name: Distribution, data: number | number[]) {
    const metric = this.registry.getOrMake(name);
    if (Array.isArray(data)) {
      data.forEach(x => metric.getDistribution().record(x));
    } else {
      metric.getDistribution().record(data);
    }
    metric.touch(this.registry.currentTime);
  }

  /*
   * Time a function call (in milliseconds) and record it as a data point in
   * a distribution. Exceptions are not recorded.
   */
  time<T>(name: Distribution, f: () => T): T {
    const startTime = Date.now();
    const rv = f();
    this.addDistribution(name, Date.now() - startTime);
    return rv;
  }

  /*
   * Time a function call that returns a promise (in milliseconds) and
   * record it as a data point in a distribution. Rejected promises are not
   * recorded.
   */
  timePromise<T>(name: Distribution, f: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    return f().then(rv => {
      this.addDistribution(name, Date.now() - startTime);
      return rv;
    });
  }

  /*
   * Time a function call (in microseconds) and record it as a data point in
   * a distribution. Exceptions are not recorded.
   */
  timeMicro<T>(name: Distribution, f: () => T): T {
    const startTime = performance.now();
    const rv = f();
    this.addDistribution(name, performance.now() - startTime);
    return rv;
  }

  /*
   * Time a function call that returns a promise (in microseconds) and
   * record it as a data point in a distribution. Rejected promises are not
   * recorded.
   */
  timeMicroPromise<T>(name: Distribution, f: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return f().then(rv => {
      this.addDistribution(name, performance.now() - startTime);
      return rv;
    });
  }

  /*
   * Return a new Metrics object that represents the same registry, but
   * prefixes all names with `(prefix)(registry.separator)`.
   */
  withPrefix(prefix: string): Metrics {
    return new Metrics(this.registry, this.prefix + prefix + this.registry.separator, this.tags);
  }
}
